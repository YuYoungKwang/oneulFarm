-- Product Keyword Mapping Sample Data
-- Target tables:
--   OFT_PRODUCT_SEARCH_KEYWORD_MAP
--   OFT_SEARCH_KEYWORD_ALIAS
--   OFT_KEYWORD_RECIPE_CATEGORY_MAP
-- Notes:
-- 1. Re-runnable with MERGE.
-- 2. PRODUCT_NAME 기준으로 OFT_PRODUCT 에서 PRODUCT_NO 를 찾아 넣습니다.
-- 3. 상품이 없으면 해당 MERGE 는 반영되지 않습니다.

-- =========================================================
-- 1) Product / Item -> Represent Keyword
-- =========================================================

MERGE INTO OFT_PRODUCT_SEARCH_KEYWORD_MAP target
USING (
    SELECT p.PRODUCT_NO AS productNo, p.CATEGORY_NO AS categoryNo, c.CATEGORY_NAME AS categoryName,
           p.PRODUCT_NAME AS productName, '양파' AS representKeyword, 1 AS priority
    FROM OFT_PRODUCT p
    LEFT JOIN OFT_PRODUCT_CATEGORY c ON c.CATEGORY_NO = p.CATEGORY_NO
    WHERE p.PRODUCT_NAME = '양파'
) source
ON (target.PRODUCT_NO = source.productNo AND target.REPRESENT_KEYWORD = source.representKeyword)
WHEN MATCHED THEN
    UPDATE SET target.CATEGORY_NO = source.categoryNo, target.CATEGORY_NAME = source.categoryName,
               target.PRODUCT_NAME = source.productName, target.PRIORITY = source.priority,
               target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (MAP_NO, CATEGORY_NO, CATEGORY_NAME, PRODUCT_NO, PRODUCT_NAME, REPRESENT_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
    VALUES (SEQ_OFT_PRODUCT_SEARCH_KEYWORD_MAP.NEXTVAL, source.categoryNo, source.categoryName, source.productNo, source.productName, source.representKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_PRODUCT_SEARCH_KEYWORD_MAP target
USING (
    SELECT p.PRODUCT_NO AS productNo, p.CATEGORY_NO AS categoryNo, c.CATEGORY_NAME AS categoryName,
           p.PRODUCT_NAME AS productName, '감자' AS representKeyword, 1 AS priority
    FROM OFT_PRODUCT p
    LEFT JOIN OFT_PRODUCT_CATEGORY c ON c.CATEGORY_NO = p.CATEGORY_NO
    WHERE p.PRODUCT_NAME = '감자'
) source
ON (target.PRODUCT_NO = source.productNo AND target.REPRESENT_KEYWORD = source.representKeyword)
WHEN MATCHED THEN
    UPDATE SET target.CATEGORY_NO = source.categoryNo, target.CATEGORY_NAME = source.categoryName,
               target.PRODUCT_NAME = source.productName, target.PRIORITY = source.priority,
               target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (MAP_NO, CATEGORY_NO, CATEGORY_NAME, PRODUCT_NO, PRODUCT_NAME, REPRESENT_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
    VALUES (SEQ_OFT_PRODUCT_SEARCH_KEYWORD_MAP.NEXTVAL, source.categoryNo, source.categoryName, source.productNo, source.productName, source.representKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_PRODUCT_SEARCH_KEYWORD_MAP target
USING (
    SELECT p.PRODUCT_NO AS productNo, p.CATEGORY_NO AS categoryNo, c.CATEGORY_NAME AS categoryName,
           p.PRODUCT_NAME AS productName, '오이' AS representKeyword, 1 AS priority
    FROM OFT_PRODUCT p
    LEFT JOIN OFT_PRODUCT_CATEGORY c ON c.CATEGORY_NO = p.CATEGORY_NO
    WHERE p.PRODUCT_NAME = '오이'
) source
ON (target.PRODUCT_NO = source.productNo AND target.REPRESENT_KEYWORD = source.representKeyword)
WHEN MATCHED THEN
    UPDATE SET target.CATEGORY_NO = source.categoryNo, target.CATEGORY_NAME = source.categoryName,
               target.PRODUCT_NAME = source.productName, target.PRIORITY = source.priority,
               target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (MAP_NO, CATEGORY_NO, CATEGORY_NAME, PRODUCT_NO, PRODUCT_NAME, REPRESENT_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
    VALUES (SEQ_OFT_PRODUCT_SEARCH_KEYWORD_MAP.NEXTVAL, source.categoryNo, source.categoryName, source.productNo, source.productName, source.representKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_PRODUCT_SEARCH_KEYWORD_MAP target
USING (
    SELECT p.PRODUCT_NO AS productNo, p.CATEGORY_NO AS categoryNo, c.CATEGORY_NAME AS categoryName,
           p.PRODUCT_NAME AS productName, '새송이' AS representKeyword, 1 AS priority
    FROM OFT_PRODUCT p
    LEFT JOIN OFT_PRODUCT_CATEGORY c ON c.CATEGORY_NO = p.CATEGORY_NO
    WHERE p.PRODUCT_NAME = '새송이버섯'
) source
ON (target.PRODUCT_NO = source.productNo AND target.REPRESENT_KEYWORD = source.representKeyword)
WHEN MATCHED THEN
    UPDATE SET target.CATEGORY_NO = source.categoryNo, target.CATEGORY_NAME = source.categoryName,
               target.PRODUCT_NAME = source.productName, target.PRIORITY = source.priority,
               target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (MAP_NO, CATEGORY_NO, CATEGORY_NAME, PRODUCT_NO, PRODUCT_NAME, REPRESENT_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
    VALUES (SEQ_OFT_PRODUCT_SEARCH_KEYWORD_MAP.NEXTVAL, source.categoryNo, source.categoryName, source.productNo, source.productName, source.representKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_PRODUCT_SEARCH_KEYWORD_MAP target
USING (
    SELECT p.PRODUCT_NO AS productNo, p.CATEGORY_NO AS categoryNo, c.CATEGORY_NAME AS categoryName,
           p.PRODUCT_NAME AS productName, '쌀' AS representKeyword, 1 AS priority
    FROM OFT_PRODUCT p
    LEFT JOIN OFT_PRODUCT_CATEGORY c ON c.CATEGORY_NO = p.CATEGORY_NO
    WHERE p.PRODUCT_NAME = '쌀'
) source
ON (target.PRODUCT_NO = source.productNo AND target.REPRESENT_KEYWORD = source.representKeyword)
WHEN MATCHED THEN
    UPDATE SET target.CATEGORY_NO = source.categoryNo, target.CATEGORY_NAME = source.categoryName,
               target.PRODUCT_NAME = source.productName, target.PRIORITY = source.priority,
               target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (MAP_NO, CATEGORY_NO, CATEGORY_NAME, PRODUCT_NO, PRODUCT_NAME, REPRESENT_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
    VALUES (SEQ_OFT_PRODUCT_SEARCH_KEYWORD_MAP.NEXTVAL, source.categoryNo, source.categoryName, source.productNo, source.productName, source.representKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

-- =========================================================
-- 2) Represent Keyword -> Search Keyword Alias
-- =========================================================

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '양파' AS representKeyword, '자색양파' AS searchKeyword, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '감자' AS representKeyword, '햇감자' AS searchKeyword, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '오이' AS representKeyword, '백오이' AS searchKeyword, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '새송이' AS representKeyword, '버섯' AS searchKeyword, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '쌀' AS representKeyword, '잡곡' AS searchKeyword, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_SEARCH_KEYWORD_ALIAS target
USING (SELECT '쌀' AS representKeyword, '떡' AS searchKeyword, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.SEARCH_KEYWORD) = UPPER(source.searchKeyword))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (ALIAS_NO, REPRESENT_KEYWORD, SEARCH_KEYWORD, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_SEARCH_KEYWORD_ALIAS.NEXTVAL, source.representKeyword, source.searchKeyword, source.priority, 'Y', SYSDATE, SYSDATE);

-- =========================================================
-- 3) Represent Keyword -> Allowed Recipe Category
-- =========================================================

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '양파' AS representKeyword, '반찬' AS recipeCategory, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '양파' AS representKeyword, '국/찜/탕' AS recipeCategory, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '감자' AS representKeyword, '메인요리' AS recipeCategory, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '감자' AS representKeyword, '간식' AS recipeCategory, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '오이' AS representKeyword, '반찬' AS recipeCategory, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '오이' AS representKeyword, '샐러드' AS recipeCategory, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '새송이' AS representKeyword, '반찬' AS recipeCategory, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '새송이' AS representKeyword, '메인요리' AS recipeCategory, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '쌀' AS representKeyword, '밥/죽' AS recipeCategory, 1 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);

MERGE INTO OFT_KEYWORD_RECIPE_CATEGORY_MAP target
USING (SELECT '쌀' AS representKeyword, '간식' AS recipeCategory, 2 AS priority FROM dual) source
ON (UPPER(target.REPRESENT_KEYWORD) = UPPER(source.representKeyword) AND UPPER(target.RECIPE_CATEGORY) = UPPER(source.recipeCategory))
WHEN MATCHED THEN UPDATE SET target.PRIORITY = source.priority, target.IS_ACTIVE = 'Y', target.UPDATED_AT = SYSDATE
WHEN NOT MATCHED THEN
INSERT (CATEGORY_MAP_NO, REPRESENT_KEYWORD, RECIPE_CATEGORY, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT)
VALUES (SEQ_OFT_KEYWORD_RECIPE_CATEGORY_MAP.NEXTVAL, source.representKeyword, source.recipeCategory, source.priority, 'Y', SYSDATE, SYSDATE);
