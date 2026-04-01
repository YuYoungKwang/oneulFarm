/* =========================================================
   ORDER / DELIVERY STATE AUDIT QUERIES (ORACLE)
   Purpose:
   - Inspect current order/delivery data before migration
   - Validate risky legacy status combinations
   - Support mapping from current status model to the new split model
   ========================================================= */


/* ---------------------------------------------------------
   1. ORDER STATUS DISTRIBUTION
   --------------------------------------------------------- */

SELECT
    ORDER_STATUS,
    COUNT(*) AS ORDER_COUNT
FROM OFT_ORDERS
GROUP BY ORDER_STATUS
ORDER BY ORDER_STATUS;


/* ---------------------------------------------------------
   2. DELIVERY STATUS DISTRIBUTION
   --------------------------------------------------------- */

SELECT
    NVL(DELIVERY_STATUS, 'NULL') AS DELIVERY_STATUS,
    COUNT(*) AS DELIVERY_COUNT
FROM OFT_DELIVERY
GROUP BY DELIVERY_STATUS
ORDER BY DELIVERY_STATUS;


/* ---------------------------------------------------------
   3. ORDER + DELIVERY STATUS MATRIX
   --------------------------------------------------------- */

SELECT
    o.ORDER_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') AS DELIVERY_STATUS,
    COUNT(*) AS ORDER_COUNT
FROM OFT_ORDERS o
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
GROUP BY
    o.ORDER_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY')
ORDER BY
    o.ORDER_STATUS,
    DELIVERY_STATUS;


/* ---------------------------------------------------------
   4. CANCELED ORDERS DETAIL
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    o.ORDERED_AT,
    p.PAYMENT_STATUS,
    p.PAID_AT,
    p.PAID_AMOUNT,
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
   5. CANCELED ORDERS SUMMARY BY PAYMENT / DELIVERY
   --------------------------------------------------------- */

SELECT
    NVL(p.PAYMENT_STATUS, 'NO_PAYMENT') AS PAYMENT_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') AS DELIVERY_STATUS,
    COUNT(*) AS ORDER_COUNT
FROM OFT_ORDERS o
LEFT JOIN OFT_PAYMENT p
    ON p.ORDER_NO = o.ORDER_NO
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE o.ORDER_STATUS = 'CANCELED'
GROUP BY
    NVL(p.PAYMENT_STATUS, 'NO_PAYMENT'),
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY')
ORDER BY
    PAYMENT_STATUS,
    DELIVERY_STATUS;


/* ---------------------------------------------------------
   6. TRACKING NUMBER EXISTS BUT DELIVERY IS READY
   --------------------------------------------------------- */

SELECT
    d.DELIVERY_NO,
    d.ORDER_NO,
    d.COURIER_NAME,
    d.TRACKING_NO,
    d.DELIVERY_STATUS,
    d.SHIPPED_AT,
    d.DELIVERED_AT
FROM OFT_DELIVERY d
WHERE d.TRACKING_NO IS NOT NULL
  AND NVL(d.DELIVERY_STATUS, 'READY') = 'READY'
ORDER BY d.ORDER_NO DESC;


/* ---------------------------------------------------------
   7. DELIVERED_AT EXISTS BUT STATUS IS NOT DELIVERED
   --------------------------------------------------------- */

SELECT
    d.DELIVERY_NO,
    d.ORDER_NO,
    d.COURIER_NAME,
    d.TRACKING_NO,
    d.DELIVERY_STATUS,
    d.SHIPPED_AT,
    d.DELIVERED_AT
FROM OFT_DELIVERY d
WHERE d.DELIVERED_AT IS NOT NULL
  AND NVL(d.DELIVERY_STATUS, 'READY') <> 'DELIVERED'
ORDER BY d.ORDER_NO DESC;


/* ---------------------------------------------------------
   8. ORDER_STATUS COMPLETED BUT DELIVERY NOT DELIVERED
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') AS DELIVERY_STATUS,
    d.TRACKING_NO,
    d.DELIVERED_AT
FROM OFT_ORDERS o
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE o.ORDER_STATUS = 'COMPLETED'
  AND NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') <> 'DELIVERED'
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   9. DELIVERY DELIVERED BUT ORDER NOT COMPLETED
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    d.DELIVERY_STATUS,
    d.TRACKING_NO,
    d.DELIVERED_AT
FROM OFT_ORDERS o
JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE d.DELIVERY_STATUS = 'DELIVERED'
  AND o.ORDER_STATUS <> 'COMPLETED'
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   10. ORDERS WITH NO DELIVERY ROW
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    o.ORDERED_AT
FROM OFT_ORDERS o
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE d.DELIVERY_NO IS NULL
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   11. ORDERS WITH NO PAYMENT ROW
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    o.ORDERED_AT
FROM OFT_ORDERS o
LEFT JOIN OFT_PAYMENT p
    ON p.ORDER_NO = o.ORDER_NO
WHERE p.PAYMENT_NO IS NULL
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   12. COURIER NAME DISTRIBUTION
   --------------------------------------------------------- */

SELECT
    NVL(COURIER_NAME, 'NULL') AS COURIER_NAME,
    COUNT(*) AS DELIVERY_COUNT
FROM OFT_DELIVERY
GROUP BY COURIER_NAME
ORDER BY DELIVERY_COUNT DESC, COURIER_NAME;


/* ---------------------------------------------------------
   13. PAYMENT STATUS DISTRIBUTION
   --------------------------------------------------------- */

SELECT
    PAYMENT_STATUS,
    COUNT(*) AS PAYMENT_COUNT
FROM OFT_PAYMENT
GROUP BY PAYMENT_STATUS
ORDER BY PAYMENT_STATUS;


/* ---------------------------------------------------------
   14. REVIEW WRITABLE LEGACY CHECK
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    d.DELIVERY_STATUS,
    COUNT(oi.ORDER_ITEM_NO) AS ITEM_COUNT
FROM OFT_ORDERS o
JOIN OFT_ORDER_ITEM oi
    ON oi.ORDER_NO = o.ORDER_NO
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
WHERE NVL(d.DELIVERY_STATUS, 'READY') = 'DELIVERED'
GROUP BY
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS,
    d.DELIVERY_STATUS
ORDER BY o.ORDER_NO DESC;


/* ---------------------------------------------------------
   15. SAMPLE LEGACY-TO-TARGET MAPPING PREVIEW
   --------------------------------------------------------- */

SELECT
    o.ORDER_NO,
    o.ORDER_ID,
    o.ORDER_STATUS AS LEGACY_ORDER_STATUS,
    NVL(d.DELIVERY_STATUS, 'NO_DELIVERY') AS LEGACY_DELIVERY_STATUS,
    CASE
        WHEN o.ORDER_STATUS IN ('CREATED', 'PAID') THEN 'PAYMENT_COMPLETED'
        WHEN o.ORDER_STATUS IN ('SHIPPING', 'COMPLETED') THEN 'ORDER_ACCEPTED'
        WHEN o.ORDER_STATUS = 'CANCELED' THEN 'REVIEW_REQUIRED'
        ELSE 'UNKNOWN'
    END AS TARGET_ORDER_STATUS,
    CASE
        WHEN o.ORDER_STATUS = 'CANCELED' THEN 'REVIEW_REQUIRED'
        ELSE 'NONE'
    END AS TARGET_CANCEL_STATUS,
    CASE
        WHEN NVL(d.DELIVERY_STATUS, 'READY') = 'READY' THEN 'NOT_STARTED'
        WHEN d.DELIVERY_STATUS = 'SHIPPING' THEN 'IN_TRANSIT'
        WHEN d.DELIVERY_STATUS = 'DELIVERED' THEN 'DELIVERED'
        ELSE 'UNKNOWN'
    END AS TARGET_DELIVERY_STATUS
FROM OFT_ORDERS o
LEFT JOIN OFT_DELIVERY d
    ON d.ORDER_NO = o.ORDER_NO
ORDER BY o.ORDERED_AT DESC, o.ORDER_NO DESC;


/* ---------------------------------------------------------
   16. SAFE FIRST CHECKLIST
   --------------------------------------------------------- */

-- Recommended execution order:
-- 1) Run query 1, 2, 3 for global distribution
-- 2) Run query 4, 5 for canceled-order inspection
-- 3) Run query 6, 7, 8, 9 for data inconsistencies
-- 4) Run query 12 for courier-name normalization candidates
-- 5) Run query 15 to preview legacy -> target mapping risk
