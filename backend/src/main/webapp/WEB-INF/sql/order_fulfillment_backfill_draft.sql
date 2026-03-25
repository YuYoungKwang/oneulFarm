/* =========================================================
   ORDER / DELIVERY BACKFILL DRAFT (ORACLE)
   Purpose:
   - Populate newly added columns after schema extension
   - Keep risky legacy cases reviewable
   - Do not run blindly on production without audit review
   ========================================================= */

/* ---------------------------------------------------------
   0. PRECONDITIONS
   ---------------------------------------------------------
   This draft assumes the DDL in:
   [order_fulfillment_separation_ddl_draft.sql]
   has already been reviewed and applied.

   This draft also assumes the audit queries in:
   [order_fulfillment_state_audit_queries.sql]
   were executed first.
   --------------------------------------------------------- */


/* ---------------------------------------------------------
   1. INITIAL SAFE DEFAULTS
   --------------------------------------------------------- */

UPDATE OFT_ORDERS
SET CANCEL_STATUS = NVL(CANCEL_STATUS, 'NONE'),
    PURCHASE_CONFIRM_STATUS = NVL(PURCHASE_CONFIRM_STATUS, 'PURCHASE_PENDING')
WHERE CANCEL_STATUS IS NULL
   OR PURCHASE_CONFIRM_STATUS IS NULL;

UPDATE OFT_DELIVERY
SET WAYBILL_STATUS = NVL(WAYBILL_STATUS, CASE
        WHEN TRACKING_NO IS NOT NULL THEN 'ASSIGNED'
        ELSE 'NOT_ASSIGNED'
    END),
    UPDATED_AT = NVL(UPDATED_AT, SYSTIMESTAMP)
WHERE WAYBILL_STATUS IS NULL
   OR UPDATED_AT IS NULL;


/* ---------------------------------------------------------
   2. ORDER STATUS BACKFILL
   --------------------------------------------------------- */

/* CREATED / PAID -> PAYMENT_COMPLETED */
UPDATE OFT_ORDERS
SET ORDER_STATUS = 'PAYMENT_COMPLETED'
WHERE ORDER_STATUS IN ('CREATED', 'PAID');

/* SHIPPING / COMPLETED -> ORDER_ACCEPTED */
UPDATE OFT_ORDERS
SET ORDER_STATUS = 'ORDER_ACCEPTED'
WHERE ORDER_STATUS IN ('SHIPPING', 'COMPLETED');

/* CANCELED remains unresolved until review */
/* Do not update CANCELED automatically here. */


/* ---------------------------------------------------------
   3. DELIVERY STATUS BACKFILL
   --------------------------------------------------------- */

/* READY -> NOT_STARTED or WAYBILL_ASSIGNED depending on tracking */
UPDATE OFT_DELIVERY
SET DELIVERY_STATUS = CASE
        WHEN TRACKING_NO IS NOT NULL THEN 'WAYBILL_ASSIGNED'
        ELSE 'NOT_STARTED'
    END,
    WAYBILL_STATUS = CASE
        WHEN TRACKING_NO IS NOT NULL THEN 'ASSIGNED'
        ELSE 'NOT_ASSIGNED'
    END,
    WAYBILL_ASSIGNED_AT = CASE
        WHEN TRACKING_NO IS NOT NULL THEN NVL(WAYBILL_ASSIGNED_AT, CREATED_AT)
        ELSE WAYBILL_ASSIGNED_AT
    END
WHERE DELIVERY_STATUS = 'READY';

/* SHIPPING -> IN_TRANSIT */
UPDATE OFT_DELIVERY
SET DELIVERY_STATUS = 'IN_TRANSIT',
    WAYBILL_STATUS = 'ASSIGNED',
    WAYBILL_ASSIGNED_AT = NVL(WAYBILL_ASSIGNED_AT, NVL(SHIPPED_AT, CREATED_AT)),
    IN_TRANSIT_AT = NVL(IN_TRANSIT_AT, SHIPPED_AT)
WHERE DELIVERY_STATUS = 'SHIPPING';

/* DELIVERED -> DELIVERED */
UPDATE OFT_DELIVERY
SET DELIVERY_STATUS = 'DELIVERED',
    WAYBILL_STATUS = 'ASSIGNED',
    WAYBILL_ASSIGNED_AT = NVL(WAYBILL_ASSIGNED_AT, NVL(SHIPPED_AT, CREATED_AT)),
    IN_TRANSIT_AT = NVL(IN_TRANSIT_AT, SHIPPED_AT),
    DELIVERED_AT = NVL(DELIVERED_AT, SYSTIMESTAMP)
WHERE DELIVERY_STATUS = 'DELIVERED';


/* ---------------------------------------------------------
   4. PURCHASE CONFIRM STATUS BACKFILL
   --------------------------------------------------------- */

/* Delivery completed orders remain purchase-pending by default */
UPDATE OFT_ORDERS o
SET PURCHASE_CONFIRM_STATUS = 'PURCHASE_PENDING'
WHERE EXISTS (
    SELECT 1
    FROM OFT_DELIVERY d
    WHERE d.ORDER_NO = o.ORDER_NO
      AND d.DELIVERY_STATUS = 'DELIVERED'
)
  AND NVL(PURCHASE_CONFIRM_STATUS, 'PURCHASE_PENDING') <> 'PURCHASE_CONFIRMED';


/* ---------------------------------------------------------
   5. CARRIER CODE BACKFILL PREP
   --------------------------------------------------------- */

/* Example normalization based on courier names.
   Adjust values after reviewing real courier-name distribution. */

UPDATE OFT_DELIVERY
SET CARRIER_CODE = 'CJ'
WHERE CARRIER_CODE IS NULL
  AND UPPER(NVL(COURIER_NAME, '')) LIKE '%CJ%';

UPDATE OFT_DELIVERY
SET CARRIER_CODE = 'LOGEN'
WHERE CARRIER_CODE IS NULL
  AND UPPER(NVL(COURIER_NAME, '')) LIKE '%LOGEN%';

UPDATE OFT_DELIVERY
SET CARRIER_CODE = 'HANJIN'
WHERE CARRIER_CODE IS NULL
  AND (
      UPPER(NVL(COURIER_NAME, '')) LIKE '%HANJIN%'
      OR COURIER_NAME LIKE '%한진%'
  );

/* If legacy default courier was stored as oneulFarm, leave unresolved for review */


/* ---------------------------------------------------------
   6. CANCEL REVIEW CANDIDATE EXTRACTION
   --------------------------------------------------------- */

/* Review these rows manually before deciding:
   - ORDER_REJECTED
   - CANCEL_ACCEPTED
*/
SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS AS LEGACY_ORDER_STATUS,
    NVL(p.PAYMENT_STATUS, 'NO_PAYMENT') AS PAYMENT_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') AS DELIVERY_STATUS,
    d.TRACKING_NO,
    d.SHIPPED_AT,
    d.DELIVERED_AT
FROM OFT_ORDERS o
LEFT JOIN OFT_PAYMENT p
    ON p.ORDER_NO = o.ORDER_NO
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE o.ORDER_STATUS = 'CANCELED'
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   7. OPTIONAL MANUAL SPLIT FOR CANCELED
   ---------------------------------------------------------
   Recommended rule of thumb:
   - payment exists and shipment did not start:
       likely CANCEL_ACCEPTED
   - payment missing or admin/test rejection pattern:
       likely ORDER_REJECTED
   Always validate with business data before applying.
   --------------------------------------------------------- */

/* Example draft only. Keep commented until reviewed.

UPDATE OFT_ORDERS o
SET ORDER_STATUS = 'ORDER_REJECTED',
    CANCEL_STATUS = 'NONE'
WHERE o.ORDER_STATUS = 'CANCELED'
  AND NOT EXISTS (
      SELECT 1
      FROM OFT_PAYMENT p
      WHERE p.ORDER_NO = o.ORDER_NO
        AND p.PAYMENT_STATUS = 'SUCCESS'
  );

UPDATE OFT_ORDERS o
SET ORDER_STATUS = 'PAYMENT_COMPLETED',
    CANCEL_STATUS = 'CANCEL_ACCEPTED'
WHERE o.ORDER_STATUS = 'CANCELED'
  AND EXISTS (
      SELECT 1
      FROM OFT_PAYMENT p
      WHERE p.ORDER_NO = o.ORDER_NO
        AND p.PAYMENT_STATUS = 'SUCCESS'
  );
*/


/* ---------------------------------------------------------
   8. HISTORY TABLE BACKFILL DRAFT
   --------------------------------------------------------- */

/* Initial order status snapshot */
INSERT INTO OFT_ORDER_STATUS_HISTORY (
    ORDER_NO,
    PREV_ORDER_STATUS,
    NEXT_ORDER_STATUS,
    CHANGED_BY_TYPE,
    CHANGED_BY_USER_NO,
    CHANGE_REASON,
    CHANGED_AT
)
SELECT
    ORDER_NO,
    NULL,
    ORDER_STATUS,
    'SYSTEM',
    NULL,
    'Initial backfill snapshot',
    NVL(UPDATED_AT, ORDERED_AT)
FROM OFT_ORDERS;


/* Delivery tracking snapshot for already-known states */
INSERT INTO OFT_DELIVERY_TRACKING_HISTORY (
    ORDER_NO,
    DELIVERY_NO,
    CARRIER_CODE,
    TRACKING_NO,
    TRACKING_STATUS,
    TRACKING_MESSAGE,
    RECORDED_BY_USER_NO,
    RECORDED_AT
)
SELECT
    ORDER_NO,
    DELIVERY_NO,
    NVL(CARRIER_CODE, 'UNASSIGNED'),
    TRACKING_NO,
    DELIVERY_STATUS,
    'Initial backfill snapshot',
    NULL,
    NVL(DELIVERED_AT, NVL(IN_TRANSIT_AT, NVL(WAYBILL_ASSIGNED_AT, CREATED_AT)))
FROM OFT_DELIVERY
WHERE DELIVERY_STATUS IN ('WAYBILL_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED')
  AND CARRIER_CODE IS NOT NULL;


/* ---------------------------------------------------------
   9. POST-BACKFILL CHECKS
   --------------------------------------------------------- */

SELECT ORDER_STATUS, CANCEL_STATUS, COUNT(*) AS ORDER_COUNT
FROM OFT_ORDERS
GROUP BY ORDER_STATUS, CANCEL_STATUS
ORDER BY ORDER_STATUS, CANCEL_STATUS;

SELECT DELIVERY_STATUS, WAYBILL_STATUS, COUNT(*) AS DELIVERY_COUNT
FROM OFT_DELIVERY
GROUP BY DELIVERY_STATUS, WAYBILL_STATUS
ORDER BY DELIVERY_STATUS, WAYBILL_STATUS;

SELECT COUNT(*) AS UNRESOLVED_CANCELED
FROM OFT_ORDERS
WHERE ORDER_STATUS = 'CANCELED';

SELECT COUNT(*) AS UNRESOLVED_CARRIER
FROM OFT_DELIVERY
WHERE TRACKING_NO IS NOT NULL
  AND CARRIER_CODE IS NULL;


/* ---------------------------------------------------------
   10. TRANSACTION NOTE
   ---------------------------------------------------------
   For real execution:
   - run in stages
   - validate each stage
   - commit only after review
   - keep a rollback/export plan
   --------------------------------------------------------- */
