-- Admin purchase / package migration
-- Safe to re-run in the same schema.

SET DEFINE OFF;

DECLARE
    PROCEDURE add_column_if_missing(
        p_table_name  IN VARCHAR2,
        p_column_name IN VARCHAR2,
        p_column_ddl  IN VARCHAR2
    ) IS
        v_count NUMBER := 0;
    BEGIN
        SELECT COUNT(*)
          INTO v_count
          FROM USER_TAB_COLUMNS
         WHERE TABLE_NAME = UPPER(p_table_name)
           AND COLUMN_NAME = UPPER(p_column_name);

        IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table_name || ' ADD (' || p_column_ddl || ')';
        END IF;
    END;

    PROCEDURE add_constraint_if_missing(
        p_table_name      IN VARCHAR2,
        p_constraint_name IN VARCHAR2,
        p_constraint_ddl  IN VARCHAR2
    ) IS
        v_count NUMBER := 0;
    BEGIN
        SELECT COUNT(*)
          INTO v_count
          FROM USER_CONSTRAINTS
         WHERE TABLE_NAME = UPPER(p_table_name)
           AND CONSTRAINT_NAME = UPPER(p_constraint_name);

        IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table_name || ' ADD CONSTRAINT ' || p_constraint_name || ' ' || p_constraint_ddl;
        END IF;
    END;

    PROCEDURE drop_constraint_if_exists(
        p_table_name      IN VARCHAR2,
        p_constraint_name IN VARCHAR2
    ) IS
        v_count NUMBER := 0;
    BEGIN
        SELECT COUNT(*)
          INTO v_count
          FROM USER_CONSTRAINTS
         WHERE TABLE_NAME = UPPER(p_table_name)
           AND CONSTRAINT_NAME = UPPER(p_constraint_name);

        IF v_count > 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table_name || ' DROP CONSTRAINT ' || p_constraint_name;
        END IF;
    END;
BEGIN
    add_column_if_missing('OFT_PURCHASE_BATCH', 'PRODUCT_NO', 'PRODUCT_NO NUMBER(19)');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'CATEGORY_NO', 'CATEGORY_NO NUMBER(19)');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'REFERENCE_UNIT_PRICE', 'REFERENCE_UNIT_PRICE NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'REFERENCE_TOTAL_PRICE', 'REFERENCE_TOTAL_PRICE NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'REFERENCE_SNAPSHOT_DATE', 'REFERENCE_SNAPSHOT_DATE DATE');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'GRADE', 'GRADE VARCHAR2(20)');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'SUPPLIER_TYPE', 'SUPPLIER_TYPE VARCHAR2(20)');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'ACTUAL_UNIT_PRICE', 'ACTUAL_UNIT_PRICE NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'ACTUAL_PURCHASE_AMOUNT', 'ACTUAL_PURCHASE_AMOUNT NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'LOGISTICS_COST', 'LOGISTICS_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'COMMISSION_RATE', 'COMMISSION_RATE NUMBER(5,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'COMMISSION_COST', 'COMMISSION_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'OTHER_PURCHASE_COST', 'OTHER_PURCHASE_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'DISCARD_RATE', 'DISCARD_RATE NUMBER(5,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'DISCARD_QTY', 'DISCARD_QTY NUMBER(10,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'SELLABLE_QTY', 'SELLABLE_QTY NUMBER(10,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'REMAINING_QTY', 'REMAINING_QTY NUMBER(10,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'TOTAL_PURCHASE_COST', 'TOTAL_PURCHASE_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PURCHASE_BATCH', 'ACTUAL_COST_PER_KG', 'ACTUAL_COST_PER_KG NUMBER(12,2) DEFAULT 0 NOT NULL');

    add_column_if_missing('OFT_PACKAGE_HISTORY', 'SALE_PRICE', 'SALE_PRICE NUMBER(10,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'SALE_STATUS', 'SALE_STATUS VARCHAR2(20) DEFAULT ''SELLING'' NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'TOTAL_USED', 'TOTAL_USED NUMBER(10,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'PACKAGING_MATERIAL_COST', 'PACKAGING_MATERIAL_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'PACKAGING_LABOR_COST', 'PACKAGING_LABOR_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'OTHER_PACKAGING_COST', 'OTHER_PACKAGING_COST NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'FINAL_COST_PER_KG', 'FINAL_COST_PER_KG NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'FINAL_COST_PER_PACKAGE', 'FINAL_COST_PER_PACKAGE NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'EXPECTED_PROFIT_PER_UNIT', 'EXPECTED_PROFIT_PER_UNIT NUMBER(12,2) DEFAULT 0 NOT NULL');
    add_column_if_missing('OFT_PACKAGE_HISTORY', 'EXPECTED_TOTAL_PROFIT', 'EXPECTED_TOTAL_PROFIT NUMBER(12,2) DEFAULT 0 NOT NULL');

    drop_constraint_if_exists('OFT_PURCHASE_BATCH', 'CK_OFT_PB_STATUS');
    drop_constraint_if_exists('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_STATUS');

    UPDATE OFT_PURCHASE_BATCH
       SET STATUS = 'PROCESSING'
     WHERE STATUS IS NULL
        OR STATUS NOT IN ('PURCHASED', 'PROCESSING', 'COMPLETED', 'ON_SALE', 'ENDED');

    UPDATE OFT_PACKAGE_HISTORY
       SET SALE_STATUS = 'READY'
     WHERE SALE_STATUS IS NULL
        OR SALE_STATUS NOT IN ('READY', 'SELLING', 'SOLD_OUT', 'STOP');

    COMMIT;

    add_constraint_if_missing(
        'OFT_PURCHASE_BATCH',
        'FK_OFT_PB_PROD',
        'FOREIGN KEY (PRODUCT_NO) REFERENCES OFT_PRODUCT (PRODUCT_NO)'
    );
    add_constraint_if_missing(
        'OFT_PURCHASE_BATCH',
        'FK_OFT_PB_CAT',
        'FOREIGN KEY (CATEGORY_NO) REFERENCES OFT_PRODUCT_CATEGORY (CATEGORY_NO)'
    );

    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_SPRICE', 'CHECK (SALE_PRICE >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_STATUS', 'CHECK (SALE_STATUS IN (''READY'', ''SELLING'', ''SOLD_OUT'', ''STOP''))');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_USED', 'CHECK (TOTAL_USED >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_MATL', 'CHECK (PACKAGING_MATERIAL_COST >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_LABOR', 'CHECK (PACKAGING_LABOR_COST >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_OTHER', 'CHECK (OTHER_PACKAGING_COST >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_FCPK', 'CHECK (FINAL_COST_PER_KG >= 0)');
    add_constraint_if_missing('OFT_PACKAGE_HISTORY', 'CK_OFT_PH_FCPP', 'CHECK (FINAL_COST_PER_PACKAGE >= 0)');

    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_REF_UP', 'CHECK (REFERENCE_UNIT_PRICE >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_REF_TP', 'CHECK (REFERENCE_TOTAL_PRICE >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_ACT_UP', 'CHECK (ACTUAL_UNIT_PRICE >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_ACT_AMT', 'CHECK (ACTUAL_PURCHASE_AMOUNT >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_LOGI', 'CHECK (LOGISTICS_COST >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_COMM_RATE', 'CHECK (COMMISSION_RATE >= 0 AND COMMISSION_RATE <= 100)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_COMM', 'CHECK (COMMISSION_COST >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_OTHER', 'CHECK (OTHER_PURCHASE_COST >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_DISC_RATE', 'CHECK (DISCARD_RATE >= 0 AND DISCARD_RATE <= 100)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_DISC_QTY', 'CHECK (DISCARD_QTY >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_SELLABLE', 'CHECK (SELLABLE_QTY >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_REMAIN', 'CHECK (REMAINING_QTY >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_TOTAL', 'CHECK (TOTAL_PURCHASE_COST >= 0)');
    add_constraint_if_missing('OFT_PURCHASE_BATCH', 'CK_OFT_PB_CPKG', 'CHECK (ACTUAL_COST_PER_KG >= 0)');

    add_constraint_if_missing(
        'OFT_PURCHASE_BATCH',
        'CK_OFT_PB_STATUS',
        'CHECK (STATUS IN (''PURCHASED'', ''PROCESSING'', ''COMPLETED'', ''ON_SALE'', ''ENDED''))'
    );
END;
/
