package com.app.controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.ApiResponse;
import com.app.common.PriceSnapshotUnitSupport;
import com.app.common.ProduceStandardWeightSupport;
import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.UserProfileDto;
import com.app.service.AdminService;
import com.app.service.PriceSnapshotService;

@RestController
@RequestMapping(value = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminController {

    private static final Pattern SNAPSHOT_UNIT_PATTERN =
        Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)?\\s*([A-Za-z\\uAC00-\\uD7A3]+)$");
    private static final Set<String> COUNT_UNIT_SET = Set.of(
        "ea",
        "each",
        "개",
        "포기",
        "단",
        "망",
        "봉",
        "봉지",
        "pack",
        "pk"
    );

    private static final String PRICE_REFERENCE_RESOURCE_PATH = "kamis-price-backfill-items.csv";
    private static final String PROCESS_REFERENCE_RESOURCE_PATH = "kamis-process-reference-items.csv";
    private static final String REFERENCE_SOURCE_WHOLESALE = "WHOLESALE";
    private static final String REFERENCE_SOURCE_CATALOG = "CATALOG";

    @Autowired
    private AdminService adminService;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @GetMapping("/product-categories")
    public ApiResponse<List<ProductCategoryDto>> getProductCategories() {
        return ApiResponse.success(adminService.getProductCategories(), "Product categories loaded.");
    }

    @GetMapping("/products")
    public ApiResponse<List<ProductDto>> getProducts() {
        return ApiResponse.success(adminService.getProducts(), "Admin products loaded.");
    }

    @PostMapping(value = "/products", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ProductDto> saveProduct(
        @RequestBody ProductDto request
    ) {
        return ApiResponse.success(adminService.saveProduct(request), "Product saved.");
    }

    @PatchMapping(value = "/products/{productNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ProductDto> updateProduct(
        @PathVariable Long productNo,
        @RequestBody ProductDto request
    ) {
        request.setProductNo(productNo);
        return ApiResponse.success(adminService.saveProduct(request), "Product updated.");
    }

    @PostMapping(value = "/products/{productNo}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<ProductImageDto>> uploadProductImages(
        @PathVariable Long productNo,
        @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.success(
            adminService.saveProductImages(productNo, files),
            "Product images uploaded."
        );
    }

    @DeleteMapping("/products/{productNo}")
    public ApiResponse<Void> deleteProduct(
        @PathVariable Long productNo
    ) {
        adminService.deleteProduct(productNo);
        return ApiResponse.success(null, "Product deleted.");
    }

    @GetMapping("/orders")
    public ApiResponse<List<OrderDto>> getOrders() {
        return ApiResponse.success(adminService.getOrders(), "Admin orders loaded.");
    }

    @GetMapping("/orders/{orderNo}")
    public ApiResponse<OrderDto> getOrderDetail(
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(adminService.getOrderDetail(orderNo), "Admin order detail loaded.");
    }

    @PatchMapping(value = "/orders/{orderNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<OrderDto> updateOrder(
        @PathVariable Long orderNo,
        @RequestBody OrderDto request
    ) {
        return ApiResponse.success(adminService.updateOrder(orderNo, request), "Admin order updated.");
    }

    @DeleteMapping("/orders/{orderNo}")
    public ApiResponse<Void> deleteOrder(
        @PathVariable Long orderNo
    ) {
        adminService.deleteOrder(orderNo);
        return ApiResponse.success(null, "Admin order deleted.");
    }

    @GetMapping("/users")
    public ApiResponse<List<UserProfileDto>> getUsers() {
        return ApiResponse.success(adminService.getUsers(), "Admin users loaded.");
    }

    @PatchMapping(value = "/users/{userNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UserProfileDto> updateUserStatus(
        @PathVariable Long userNo,
        @RequestBody UserProfileDto request
    ) {
        return ApiResponse.success(adminService.updateUserStatus(userNo, request), "Admin user updated.");
    }

    @DeleteMapping("/users/{userNo}")
    public ApiResponse<Void> deleteUser(
        @PathVariable Long userNo
    ) {
        adminService.deleteUser(userNo);
        return ApiResponse.success(null, "Admin user deleted.");
    }

    @GetMapping("/purchases")
    public ApiResponse<List<PurchaseBatchDto>> getPurchases() {
        return ApiResponse.success(adminService.getPurchaseBatches(), "Purchase batches loaded.");
    }

    @GetMapping("/package-histories")
    public ApiResponse<List<PackageHistoryDto>> getPackageHistories() {
        return ApiResponse.success(adminService.getPackageHistories(), "Package histories loaded.");
    }

    @GetMapping("/purchases/reference-items")
    public ApiResponse<List<Map<String, Object>>> getPurchaseReferenceItems() {
        return ApiResponse.success(buildPurchaseReferenceItems(), "Purchase reference items loaded.");
    }

    @GetMapping("/purchases/quote")
    public ApiResponse<Map<String, Object>> getPurchaseQuote(
        @RequestParam(value = "productName", required = false) String productName,
        @RequestParam(value = "itemCode", required = false) String itemCode
    ) {
        return ApiResponse.success(buildPurchaseQuote(productName, itemCode), "Purchase quote loaded.");
    }

    @PostMapping(value = "/purchases", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<PurchaseBatchDto> createPurchase(
        @RequestBody PurchaseBatchDto request
    ) {
        return ApiResponse.success(adminService.createPurchaseBatch(request), "Purchase batch created.");
    }

    @DeleteMapping("/purchases/{batchNo}")
    public ApiResponse<Void> deletePurchase(
        @PathVariable Long batchNo
    ) {
        adminService.deletePurchaseBatch(batchNo);
        return ApiResponse.success(null, "Purchase batch deleted.");
    }

    @PostMapping(value = "/purchases/{batchNo}/package", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<PackageHistoryDto> packageBatch(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long batchNo,
        @RequestBody PackageHistoryDto request
    ) {
        return ApiResponse.success(adminService.packageBatch(userNo, batchNo, request), "Package history created.");
    }

    @GetMapping("/content/banners")
    public ApiResponse<List<MainBannerDto>> getBanners() {
        return ApiResponse.success(adminService.getMainBanners(), "Admin banners loaded.");
    }

    @GetMapping("/content/recipe-mappings")
    public ApiResponse<List<ProductRecipeDto>> getRecipeMappings() {
        return ApiResponse.success(adminService.getRecipeMappings(), "Recipe mappings loaded.");
    }

    private List<Map<String, Object>> buildPurchaseReferenceItems() {
        List<PriceSnapshotDTO> wholesaleCandidates =
            priceSnapshotService.getPriceSnapshotList(null, "WHOLESALE", null, 400);
        Map<String, Map<String, Object>> uniqueItems = new LinkedHashMap<String, Map<String, Object>>();

        for (PriceSnapshotDTO snapshot : wholesaleCandidates) {
            String storedItemCode = trimToNull(snapshot.getItemCode());
            String itemName = trimToNull(snapshot.getItemName());
            if (storedItemCode == null || itemName == null || uniqueItems.containsKey(storedItemCode)) {
                continue;
            }

            String categoryName = resolvePurchaseReferenceCategory(snapshot);
            String snapshotUnit = trimToNull(snapshot.getUnit());
            mergePurchaseReferenceItem(
                uniqueItems,
                storedItemCode,
                normalizeReferenceProductName(itemName),
                categoryName,
                snapshotUnit,
                snapshot.getSnapshotDate(),
                itemName,
                true,
                REFERENCE_SOURCE_WHOLESALE
            );
        }

        mergeCatalogPurchaseReferenceItems(uniqueItems);
        return new ArrayList<Map<String, Object>>(uniqueItems.values());
    }

    private void mergePurchaseReferenceItem(
        Map<String, Map<String, Object>> uniqueItems,
        String itemCode,
        String productName,
        String categoryName,
        String snapshotUnit,
        Object snapshotDate,
        String displayName,
        boolean supportsAutoQuote,
        String referenceSource
    ) {
        String normalizedItemCode = trimToNull(itemCode);
        String normalizedProductName = trimToNull(productName);
        String normalizedCategoryName = trimToNull(categoryName);
        if (normalizedItemCode == null || normalizedProductName == null || normalizedCategoryName == null) {
            return;
        }
        if (uniqueItems.containsKey(normalizedItemCode)) {
            return;
        }

        String normalizedDisplayName = trimToNull(displayName);
        if (normalizedDisplayName == null) {
            normalizedDisplayName = normalizedProductName;
        }

        Map<String, Object> itemData = new LinkedHashMap<String, Object>();
        itemData.put("itemCode", normalizedItemCode);
        itemData.put("productName", normalizedProductName);
        itemData.put("categoryName", normalizedCategoryName);
        itemData.put("snapshotUnit", trimToNull(snapshotUnit));
        itemData.put("snapshotDate", snapshotDate);
        itemData.put(
            "displayLabel",
            buildPurchaseReferenceLabel(
                normalizedCategoryName,
                buildReferenceDisplayName(normalizedDisplayName),
                trimToNull(snapshotUnit)
            )
        );
        itemData.put("supportsAutoQuote", supportsAutoQuote);
        itemData.put("referenceSource", referenceSource);
        uniqueItems.put(normalizedItemCode, itemData);
    }

    private void mergeCatalogPurchaseReferenceItems(Map<String, Map<String, Object>> uniqueItems) {
        for (Map<String, String> catalogItem : loadRetailCatalogReferenceItems()) {
            String categoryName = resolveCatalogCategoryName(
                catalogItem.get("itemCategoryCode"),
                catalogItem.get("itemNameHint")
            );
            if (categoryName == null) {
                continue;
            }

            String syntheticItemCode = trimToNull(
                "catalog:"
                    + catalogItem.get("itemCategoryCode")
                    + ":"
                    + catalogItem.get("itemCode")
                    + ":"
                    + catalogItem.get("kindCode")
            );
            mergePurchaseReferenceItem(
                uniqueItems,
                syntheticItemCode,
                normalizeReferenceProductName(catalogItem.get("itemNameHint")),
                categoryName,
                catalogItem.get("unitHint"),
                null,
                catalogItem.get("itemNameHint"),
                false,
                REFERENCE_SOURCE_CATALOG
            );
        }

        for (Map<String, String> catalogItem : loadProcessCatalogReferenceItems()) {
            String syntheticItemCode = trimToNull(
                "catalog:800:"
                    + catalogItem.get("itemCode")
                    + ":"
                    + catalogItem.get("kindCode")
            );
            mergePurchaseReferenceItem(
                uniqueItems,
                syntheticItemCode,
                normalizeReferenceProductName(catalogItem.get("itemNameHint")),
                "\uAC00\uACF5\uC2DD\uD488",
                catalogItem.get("unitHint"),
                null,
                catalogItem.get("itemNameHint"),
                false,
                REFERENCE_SOURCE_CATALOG
            );
        }
    }

    private List<Map<String, String>> loadRetailCatalogReferenceItems() {
        List<Map<String, String>> catalogItemList = new ArrayList<Map<String, String>>();
        ClassPathResource classPathResource = new ClassPathResource(PRICE_REFERENCE_RESOURCE_PATH);
        if (!classPathResource.exists()) {
            return catalogItemList;
        }

        try (BufferedReader bufferedReader = new BufferedReader(
            new InputStreamReader(classPathResource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line;
            boolean headerSkipped = false;
            while ((line = bufferedReader.readLine()) != null) {
                String normalizedLine = line.trim();
                if (normalizedLine.isEmpty() || normalizedLine.startsWith("#")) {
                    continue;
                }
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }

                String[] tokenArray = normalizedLine.split(",", -1);
                if (tokenArray.length < 10) {
                    continue;
                }

                Map<String, String> itemData = new LinkedHashMap<String, String>();
                itemData.put("itemCategoryCode", trimToNull(tokenArray[2]));
                itemData.put("itemCode", trimToNull(tokenArray[3]));
                itemData.put("kindCode", trimToNull(tokenArray[4]));
                itemData.put("itemNameHint", trimToNull(tokenArray[8]));
                itemData.put("unitHint", trimToNull(tokenArray[9]));
                catalogItemList.add(itemData);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load KAMIS retail reference catalog.", exception);
        }

        return catalogItemList;
    }

    private List<Map<String, String>> loadProcessCatalogReferenceItems() {
        List<Map<String, String>> catalogItemList = new ArrayList<Map<String, String>>();
        ClassPathResource classPathResource = new ClassPathResource(PROCESS_REFERENCE_RESOURCE_PATH);
        if (!classPathResource.exists()) {
            return catalogItemList;
        }

        try (BufferedReader bufferedReader = new BufferedReader(
            new InputStreamReader(classPathResource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line;
            boolean headerSkipped = false;
            while ((line = bufferedReader.readLine()) != null) {
                String normalizedLine = line.trim();
                if (normalizedLine.isEmpty() || normalizedLine.startsWith("#")) {
                    continue;
                }
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }

                String[] tokenArray = normalizedLine.split(",", -1);
                if (tokenArray.length < 6) {
                    continue;
                }

                Map<String, String> itemData = new LinkedHashMap<String, String>();
                itemData.put("itemCode", trimToNull(tokenArray[2]));
                itemData.put("kindCode", trimToNull(tokenArray[3]));
                itemData.put("itemNameHint", trimToNull(tokenArray[4]));
                itemData.put("unitHint", trimToNull(tokenArray[5]));
                catalogItemList.add(itemData);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load KAMIS process reference catalog.", exception);
        }

        return catalogItemList;
    }

    private String resolveCatalogCategoryName(String itemCategoryCode, String itemName) {
        String normalizedCategoryCode = trimToNull(itemCategoryCode);
        if ("800".equals(normalizedCategoryCode)) {
            return "\uAC00\uACF5\uC2DD\uD488";
        }
        if ("500".equals(normalizedCategoryCode)) {
            if (looksLikeDairyItem(itemName)) {
                return "\uC720\uC81C\uD488";
            }
            if (looksLikeEggItem(itemName)) {
                return "\uB2EC\uAC40";
            }
            return "\uC721\uB958";
        }
        if (itemName != null && !looksLikeUnsupportedPurchaseReferenceItem(itemName)) {
            return "\uCC44\uC18C";
        }
        return null;
    }

    private String normalizeReferenceProductName(String value) {
        List<String> segmentList = splitReferenceNameSegments(value);
        if (segmentList.isEmpty()) {
            return trimToNull(value);
        }
        return segmentList.get(0);
    }

    private String buildReferenceDisplayName(String value) {
        List<String> segmentList = splitReferenceNameSegments(value);
        if (segmentList.isEmpty()) {
            return trimToNull(value);
        }
        return String.join(" / ", segmentList);
    }

    private List<String> splitReferenceNameSegments(String value) {
        List<String> segmentList = new ArrayList<String>();
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return segmentList;
        }

        String[] tokenArray = normalizedValue.split("/");
        for (String token : tokenArray) {
            String normalizedToken = trimToNull(token);
            if (normalizedToken != null && !segmentList.contains(normalizedToken)) {
                segmentList.add(normalizedToken);
            }
        }
        return segmentList;
    }

    private Map<String, Object> buildPurchaseQuote(String productName, String itemCode) {
        String normalizedProductName = trimToNull(productName);
        String normalizedItemCode = trimToNull(itemCode);
        if (normalizedProductName == null && normalizedItemCode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상품명을 입력해주세요.");
        }

        List<PriceSnapshotDTO> wholesaleCandidates;
        PriceSnapshotDTO wholesaleSnapshot;
        if (normalizedItemCode != null) {
            wholesaleCandidates = priceSnapshotService.getPriceSnapshotList(null, "WHOLESALE", null, 400);
            wholesaleSnapshot = findSnapshotByItemCode(normalizedItemCode, wholesaleCandidates);
        } else {
            wholesaleCandidates = priceSnapshotService.getPriceSnapshotList(normalizedProductName, "WHOLESALE", null, 40);
            wholesaleSnapshot = findBestSnapshot(normalizedProductName, wholesaleCandidates);
        }
        if (wholesaleSnapshot == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 품목의 최신 도매 시세를 찾지 못했습니다.");
        }
        if (normalizedProductName == null) {
            normalizedProductName = trimToNull(wholesaleSnapshot.getItemName());
        }

        List<PriceSnapshotDTO> retailCandidates =
            priceSnapshotService.getPriceSnapshotList(normalizedProductName, "RETAIL", null, 40);
        PriceSnapshotDTO retailSnapshot = findRelatedRetailSnapshot(
            normalizedProductName,
            wholesaleSnapshot,
            retailCandidates
        );

        ResolvedPurchaseQuote resolvedQuote = resolvePurchaseQuote(wholesaleSnapshot);
        String normalizedWholesaleUnit = PriceSnapshotUnitSupport.normalizeConvertedRetailWeightUnit(
            wholesaleSnapshot.getItemCode(),
            wholesaleSnapshot.getUnit()
        );
        String normalizedRetailUnit = retailSnapshot == null
            ? null
            : PriceSnapshotUnitSupport.normalizeConvertedRetailWeightUnit(retailSnapshot.getItemCode(), retailSnapshot.getUnit());

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("queryName", normalizedProductName);
        data.put("requestedItemCode", normalizedItemCode);
        data.put("matchedItemName", wholesaleSnapshot.getItemName());
        data.put("matchedItemCode", trimToNull(wholesaleSnapshot.getItemCode()));
        data.put("snapshotDate", wholesaleSnapshot.getSnapshotDate());
        data.put("wholesaleSnapshotDate", wholesaleSnapshot.getSnapshotDate());
        data.put("retailSnapshotDate", retailSnapshot == null ? null : retailSnapshot.getSnapshotDate());
        data.put("snapshotUnit", normalizedWholesaleUnit);
        data.put("wholesaleSourceUnit", normalizedWholesaleUnit);
        data.put("purchaseUnit", resolvedQuote.getPurchaseUnit());
        data.put("purchaseQty", resolvedQuote.getPurchaseQty());
        data.put("purchasePrice", resolvedQuote.getPurchasePrice());
        data.put("pricingBaseUnit", resolvedQuote.getPricingBaseUnit());
        data.put("pricingBaseQty", resolvedQuote.getPricingBaseQty());
        data.put("pricingBasePrice", resolvedQuote.getPricingBasePrice());
        BigDecimal wholesaleSourcePrice = scaleMoney(wholesaleSnapshot.getAvgPrice());
        BigDecimal retailSourcePrice = retailSnapshot == null ? null : scaleMoney(retailSnapshot.getAvgPrice());
        ParsedUnit wholesaleParsedUnit = parseSnapshotUnit(normalizedWholesaleUnit);
        PricingBasis pricingBasis = resolvePricingBasis(wholesaleParsedUnit);
        BigDecimal wholesaleComparablePrice = calculateComparablePriceForBasis(wholesaleSnapshot, pricingBasis);
        BigDecimal retailComparablePrice = retailSnapshot == null
            ? null
            : calculateComparablePriceForBasis(retailSnapshot, pricingBasis);
        String priceBasisUnit = pricingBasis == null ? null : pricingBasis.getLabel();

        data.put("priceBasisUnit", priceBasisUnit);
        data.put("wholesalePriceBasisUnit", priceBasisUnit);
        data.put("retailPriceBasisUnit", priceBasisUnit);
        data.put("recommendedPriceBasisUnit", priceBasisUnit);
        data.put("wholesaleSourcePrice", wholesaleSourcePrice);
        data.put("retailSourcePrice", retailSourcePrice);
        data.put("wholesaleAvgPrice", wholesaleComparablePrice);
        data.put("wholesaleComparablePrice", wholesaleComparablePrice);
        data.put("retailAvgPrice", retailComparablePrice);
        data.put("retailSnapshotUnit", normalizedRetailUnit);
        data.put("retailComparablePrice", retailComparablePrice);
        data.put(
            "recommendedSalePrice",
            wholesaleComparablePrice == null || retailComparablePrice == null
                ? null
                : calculateRecommendedSalePrice(wholesaleComparablePrice, retailComparablePrice)
        );
        data.put(
            "pricingNote",
            buildPricingNoteForBasis(wholesaleSnapshot, retailSnapshot, pricingBasis, wholesaleComparablePrice, retailComparablePrice)
        );
        data.put("wholesaleItemCode", trimToNull(wholesaleSnapshot.getItemCode()));
        data.put("retailItemCode", retailSnapshot == null ? null : trimToNull(retailSnapshot.getItemCode()));
        return data;
    }

    private String buildPurchaseReferenceLabel(String categoryName, String itemName, String snapshotUnit) {
        StringBuilder labelBuilder = new StringBuilder();
        if (categoryName != null) {
            labelBuilder.append(categoryName).append(" / ");
        }
        labelBuilder.append(itemName);
        if (snapshotUnit != null) {
            labelBuilder.append(" / ").append(snapshotUnit);
        }
        return labelBuilder.toString();
    }

    private String resolvePurchaseReferenceCategory(PriceSnapshotDTO snapshot) {
        String itemName = trimToNull(snapshot.getItemName());
        String normalizedItemName = normalizeReferenceProductName(itemName);
        if (normalizedItemName == null) {
            normalizedItemName = itemName;
        }
        String itemCategoryCode = extractStoredItemCategoryCode(snapshot.getItemCode());

        if (normalizedItemName != null) {
            if (looksLikeDairyItem(normalizedItemName)) {
                return "\uC720\uC81C\uD488";
            }
            if (looksLikeEggItem(normalizedItemName)) {
                return "\uB2EC\uAC40";
            }
            if (looksLikeMeatItem(normalizedItemName)) {
                return "\uC721\uB958";
            }
            if (looksLikeMushroomItem(normalizedItemName)) {
                return "\uBC84\uC12F";
            }
            if (looksLikeFruitItem(normalizedItemName)) {
                return "\uACFC\uC77C";
            }
        }

        if ("400".equals(itemCategoryCode)) {
            return "\uACFC\uC77C";
        }
        if ("300".equals(itemCategoryCode) && normalizedItemName != null && looksLikeMushroomItem(normalizedItemName)) {
            return "\uBC84\uC12F";
        }
        if ("100".equals(itemCategoryCode) || "200".equals(itemCategoryCode)) {
            return "\uCC44\uC18C";
        }
        if (normalizedItemName != null && !looksLikeUnsupportedPurchaseReferenceItem(normalizedItemName)) {
            return "\uCC44\uC18C";
        }
        return null;
    }

    private String extractStoredItemCategoryCode(String itemCode) {
        String normalizedItemCode = trimToNull(itemCode);
        if (normalizedItemCode == null || !normalizedItemCode.contains("_")) {
            return null;
        }

        String[] tokenArray = normalizedItemCode.split("_");
        if (tokenArray.length < 2) {
            return null;
        }
        return trimToNull(tokenArray[1]);
    }

    private boolean looksLikeFruitItem(String itemName) {
        return equalsAnyKeyword(
            itemName,
            "\uC0AC\uACFC", "\uBC30", "\uBCF5\uC22D\uC544", "\uD3EC\uB3C4", "\uAC10\uADE4", "\uB2E8\uAC10",
            "\uBC14\uB098\uB098", "\uCC38\uB2E4\uB798", "\uC218\uBC15", "\uCC38\uC678", "\uB538\uAE30", "\uBA5C\uB860"
        );
    }

    private boolean looksLikeMushroomItem(String itemName) {
        return containsAnyKeyword(itemName, "\uBC84\uC12F", "\uC1A1\uC774");
    }

    private boolean looksLikeMeatItem(String itemName) {
        return containsAnyKeyword(
            itemName,
            "\uC1E0\uACE0\uAE30", "\uC18C\uACE0\uAE30", "\uD55C\uC6B0", "\uC18C ", "\uC548\uC2EC", "\uB4F1\uC2EC",
            "\uC124\uB3C4", "\uC591\uC9C0", "\uAC08\uBE44", "\uB3FC\uC9C0", "\uC0BC\uACB9\uC0B4", "\uBAA9\uC2EC",
            "\uC55E\uB2E4\uB9AC", "\uB2ED ", "\uC721\uACC4", "\uD1A0\uC885\uB2ED", "\uAC00\uC2B4\uC0B4",
            "\uBD81\uCC44", "\uC624\uB9AC"
        );
    }

    private boolean looksLikeEggItem(String itemName) {
        return containsAnyKeyword(itemName, "\uACC4\uB780", "\uB2EC\uAC40", "\uD2B9\uB780");
    }

    private boolean looksLikeDairyItem(String itemName) {
        return containsAnyKeyword(
            itemName,
            "\uC6B0\uC720", "\uCE58\uC988", "\uC694\uAC70\uD2B8", "\uC694\uAD6C\uB974\uD2B8",
            "\uBC84\uD130", "\uBD84\uC720", "\uC5F0\uC720"
        );
    }

    private boolean looksLikeUnsupportedPurchaseReferenceItem(String itemName) {
        return containsAnyKeyword(
            itemName,
            "\uAC00\uB9AC\uBE44",
            "\uAC08\uCE58",
            "\uACE0\uB4F1\uC5B4",
            "\uAD74",
            "\uAE40",
            "\uB2E4\uC2DC\uB9C8",
            "\uBA78\uCE58",
            "\uBBF8\uC5ED",
            "\uC624\uC9D5\uC5B4",
            "\uC0C8\uC6B0",
            "\uBCD1\uC5B4",
            "\uBD81\uC5B4",
            "\uAF41\uCE58",
            "\uBA85\uD0DC",
            "\uBB38\uC5B4",
            "\uCC38\uAE68",
            "\uD325",
            "\uBA54\uBC00",
            "\uB4E4\uAE68",
            "\uB545\uCF69",
            "\uC300",
            "\uCC39\uC300",
            "\uCF69",
            "\uB179\uB450",
            "\uC870",
            "\uC218\uC218"
        );
    }

    private boolean containsAnyKeyword(String value, String... keywordArray) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return false;
        }

        for (String keyword : keywordArray) {
            if (normalizedValue.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private boolean equalsAnyKeyword(String value, String... keywordArray) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return false;
        }

        for (String keyword : keywordArray) {
            if (normalizedValue.equals(keyword)) {
                return true;
            }
        }
        return false;
    }

    private PriceSnapshotDTO findSnapshotByItemCode(String itemCode, List<PriceSnapshotDTO> candidates) {
        String normalizedItemCode = trimToNull(itemCode);
        if (normalizedItemCode == null || candidates == null || candidates.isEmpty()) {
            return null;
        }

        for (PriceSnapshotDTO candidate : candidates) {
            if (normalizedItemCode.equals(trimToNull(candidate.getItemCode()))) {
                return candidate;
            }
        }
        return null;
    }

    private PriceSnapshotDTO findBestSnapshot(String query, List<PriceSnapshotDTO> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        PriceSnapshotDTO bestCandidate = null;
        int bestScore = Integer.MIN_VALUE;

        for (PriceSnapshotDTO candidate : candidates) {
            int score = calculateSnapshotMatchScore(query, candidate);
            if (bestCandidate == null || score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }
        }

        return bestCandidate;
    }

    private PriceSnapshotDTO findRelatedRetailSnapshot(
        String query,
        PriceSnapshotDTO wholesaleSnapshot,
        List<PriceSnapshotDTO> retailCandidates
    ) {
        if (retailCandidates == null || retailCandidates.isEmpty()) {
            return null;
        }

        String wholesaleItemCode = trimToNull(wholesaleSnapshot.getItemCode());
        String wholesaleItemName = normalizeSearchKey(wholesaleSnapshot.getItemName());
        PriceSnapshotDTO bestCandidate = null;
        int bestScore = Integer.MIN_VALUE;

        for (PriceSnapshotDTO candidate : retailCandidates) {
            int score = calculateSnapshotMatchScore(query, candidate);

            if (wholesaleItemCode != null && wholesaleItemCode.equals(trimToNull(candidate.getItemCode()))) {
                score += 2000;
            }

            if (wholesaleItemName.equals(normalizeSearchKey(candidate.getItemName()))) {
                score += 1800;
            }

            if (isDailySnapshot(candidate)) {
                score += 400;
            } else if (isPeriodSnapshot(candidate)) {
                score -= 100;
            }

            if (bestCandidate == null || score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }
        }

        return bestCandidate;
    }

    private int calculateSnapshotMatchScore(String query, PriceSnapshotDTO candidate) {
        if (candidate == null) {
            return Integer.MIN_VALUE;
        }

        String normalizedQuery = normalizeSearchKey(query);
        String normalizedItemName = normalizeSearchKey(candidate.getItemName());
        if (normalizedItemName.isEmpty()) {
            return Integer.MIN_VALUE;
        }

        int score = 0;
        if (normalizedItemName.equals(normalizedQuery)) {
            score += 1000;
        } else if (normalizedItemName.startsWith(normalizedQuery)) {
            score += 700;
        } else if (normalizedItemName.contains(normalizedQuery)) {
            score += 500;
        }

        String rawItemName = trimToNull(candidate.getItemName());
        if (rawItemName != null && rawItemName.equalsIgnoreCase(query.trim())) {
            score += 150;
        }

        score -= Math.max(normalizedItemName.length() - normalizedQuery.length(), 0);
        return score;
    }

    private ResolvedPurchaseQuote resolvePurchaseQuote(PriceSnapshotDTO wholesaleSnapshot) {
        String snapshotUnit = resolveEffectiveSnapshotUnit(wholesaleSnapshot);
        BigDecimal avgPrice = scaleMoney(wholesaleSnapshot.getAvgPrice());
        if (snapshotUnit == null) {
            return new ResolvedPurchaseQuote("ea", BigDecimal.ONE, avgPrice);
        }

        ParsedUnit parsedUnit = parseSnapshotUnit(snapshotUnit);
        if (parsedUnit == null) {
            return new ResolvedPurchaseQuote(snapshotUnit, BigDecimal.ONE, avgPrice);
        }

        return new ResolvedPurchaseQuote(parsedUnit.getDisplayUnit(), parsedUnit.getQuantity(), avgPrice);
    }

    private BigDecimal calculateComparablePriceForBase(
        PriceSnapshotDTO snapshot,
        ResolvedPurchaseQuote baseQuote
    ) {
        if (snapshot == null || baseQuote == null || snapshot.getAvgPrice() == null) {
            return null;
        }

        ParsedUnit sourceUnit = parseSnapshotUnit(resolveEffectiveSnapshotUnit(snapshot));
        ParsedUnit targetUnit = resolveUnit(baseQuote.getPricingBaseUnit(), baseQuote.getPricingBaseQty());
        if (sourceUnit == null || targetUnit == null) {
            return null;
        }
        if (sourceUnit.getUnitType() != targetUnit.getUnitType()) {
            return null;
        }
        if (sourceUnit.getQuantity().compareTo(BigDecimal.ZERO) <= 0
            || targetUnit.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        return scaleMoney(snapshot.getAvgPrice())
            .multiply(targetUnit.getQuantity())
            .divide(sourceUnit.getQuantity(), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateComparablePriceForBasis(PriceSnapshotDTO snapshot, PricingBasis pricingBasis) {
        if (snapshot == null || snapshot.getAvgPrice() == null || pricingBasis == null) {
            return null;
        }

        ParsedUnit parsedUnit = parseSnapshotUnit(resolveEffectiveSnapshotUnit(snapshot));
        if (parsedUnit == null) {
            return null;
        }

        if (parsedUnit.getUnitType() == pricingBasis.getUnitType()) {
            BigDecimal sourceQuantity = parsedUnit.getQuantity();
            BigDecimal basisQuantity = pricingBasis.getQuantity();
            if (parsedUnit.getUnitType() == UnitType.WEIGHT) {
                if ("kg".equalsIgnoreCase(parsedUnit.getDisplayUnit())) {
                    sourceQuantity = sourceQuantity.multiply(BigDecimal.valueOf(1000L));
                }
                if ("kg".equalsIgnoreCase(pricingBasis.getDisplayUnit())) {
                    basisQuantity = basisQuantity.multiply(BigDecimal.valueOf(1000L));
                }
            }

            if (sourceQuantity.compareTo(BigDecimal.ZERO) <= 0
                || basisQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                return null;
            }

            return scaleMoney(snapshot.getAvgPrice())
                .multiply(basisQuantity)
                .divide(sourceQuantity, 2, RoundingMode.HALF_UP);
        }

        BigDecimal sourceAmountInGram = ProduceStandardWeightSupport.resolveSnapshotAmountInGram(
            snapshot.getItemName(),
            resolveEffectiveSnapshotUnit(snapshot)
        );
        BigDecimal basisAmountInGram = ProduceStandardWeightSupport.resolveProductAmountInGram(
            snapshot.getItemName(),
            pricingBasis.getDisplayUnit(),
            pricingBasis.getQuantity()
        );
        if (sourceAmountInGram == null
            || basisAmountInGram == null
            || sourceAmountInGram.compareTo(BigDecimal.ZERO) <= 0
            || basisAmountInGram.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        return scaleMoney(snapshot.getAvgPrice())
            .multiply(basisAmountInGram)
            .divide(sourceAmountInGram, 2, RoundingMode.HALF_UP);
    }

    private PricingBasis resolvePricingBasis(ParsedUnit parsedUnit) {
        if (parsedUnit == null) {
            return null;
        }
        if (parsedUnit.getUnitType() == UnitType.WEIGHT) {
            return new PricingBasis("kg", BigDecimal.ONE, UnitType.WEIGHT, "1kg");
        }
        return new PricingBasis(
            normalizeCountDisplayUnit(parsedUnit.getDisplayUnit()),
            BigDecimal.ONE,
            UnitType.COUNT,
            buildCountBasisLabelSafe(parsedUnit.getDisplayUnit())
        );
    }

    private String buildCountBasisLabelSafe(String displayUnit) {
        String normalizedDisplayUnit = trimToNull(displayUnit);
        if (normalizedDisplayUnit == null) {
            return "1개";
        }
        if ("ea".equalsIgnoreCase(normalizedDisplayUnit) || "each".equalsIgnoreCase(normalizedDisplayUnit)) {
            return "1개";
        }
        return "1" + normalizedDisplayUnit;
    }

    private String normalizeCountDisplayUnit(String displayUnit) {
        String normalizedDisplayUnit = trimToNull(displayUnit);
        if (normalizedDisplayUnit == null) {
            return "개";
        }
        if ("ea".equalsIgnoreCase(normalizedDisplayUnit) || "each".equalsIgnoreCase(normalizedDisplayUnit)) {
            return "개";
        }
        return normalizedDisplayUnit;
    }

    private String buildCountBasisLabel(String displayUnit) {
        String normalizedDisplayUnit = trimToNull(displayUnit);
        if (normalizedDisplayUnit == null) {
            return "1개";
        }
        if ("ea".equalsIgnoreCase(normalizedDisplayUnit) || "each".equalsIgnoreCase(normalizedDisplayUnit)) {
            return "1개";
        }
        return "1" + normalizedDisplayUnit;
    }

    private ParsedUnit parseSnapshotUnit(String snapshotUnit) {
        String normalizedValue = trimToNull(snapshotUnit);
        if (normalizedValue == null) {
            return null;
        }

        Matcher matcher = SNAPSHOT_UNIT_PATTERN.matcher(normalizedValue.replace(" ", ""));
        if (!matcher.matches()) {
            return null;
        }

        String amountToken = trimToNull(matcher.group(1));
        String unitToken = trimToNull(matcher.group(2));
        if (unitToken == null) {
            return null;
        }

        BigDecimal quantity = amountToken == null ? BigDecimal.ONE : new BigDecimal(amountToken);
        String normalizedUnitToken = unitToken.toLowerCase(Locale.ROOT);

        return resolveUnit(normalizedUnitToken, unitToken, quantity);
    }

    private ParsedUnit resolveUnit(String unit, BigDecimal quantity) {
        if (quantity == null) {
            return null;
        }

        String normalizedUnit = trimToNull(unit);
        if (normalizedUnit == null) {
            return null;
        }

        return resolveUnit(normalizedUnit.toLowerCase(Locale.ROOT), normalizedUnit, quantity);
    }

    private ParsedUnit resolveUnit(String normalizedUnitToken, String displayUnit, BigDecimal quantity) {
        if ("kg".equals(normalizedUnitToken)) {
            return new ParsedUnit("kg", quantity, UnitType.WEIGHT);
        }
        if ("g".equals(normalizedUnitToken)) {
            return new ParsedUnit("g", quantity, UnitType.WEIGHT);
        }
        if ("ea".equals(normalizedUnitToken) || "each".equals(normalizedUnitToken)) {
            return new ParsedUnit("ea", quantity, UnitType.COUNT);
        }
        if (COUNT_UNIT_SET.contains(normalizedUnitToken)) {
            return new ParsedUnit(displayUnit, quantity, UnitType.COUNT);
        }

        return new ParsedUnit(displayUnit, quantity, UnitType.COUNT);
    }

    private BigDecimal calculateRecommendedSalePrice(BigDecimal wholesaleAvgPrice, BigDecimal retailAvgPrice) {
        BigDecimal wholesale = scaleMoney(wholesaleAvgPrice);
        BigDecimal retail = scaleMoney(retailAvgPrice);
        return wholesale
            .add(retail)
            .divide(BigDecimal.valueOf(2L), 0, RoundingMode.HALF_UP);
    }

    private String buildPricingNoteForBasis(
        PriceSnapshotDTO wholesaleSnapshot,
        PriceSnapshotDTO retailSnapshot,
        PricingBasis pricingBasis,
        BigDecimal wholesaleComparablePrice,
        BigDecimal retailComparablePrice
    ) {
        String basisLabel = pricingBasis == null ? "기준 단위" : pricingBasis.getLabel();
        if (wholesaleComparablePrice == null) {
            return String.format(
                Locale.KOREAN,
                "도매 시세 단위를 %s 기준으로 환산할 수 없어 권장 판매가를 계산하지 않았습니다.",
                basisLabel
            );
        }
        if (retailSnapshot == null) {
            return "연결된 소매 시세가 없어 권장 판매가를 계산하지 않았습니다.";
        }
        if (retailComparablePrice == null) {
            return String.format(
                Locale.KOREAN,
                "소매 시세 단위(%s)가 %s 기준과 맞지 않아 환산값과 권장 판매가를 계산하지 않았습니다.",
                resolveEffectiveSnapshotUnit(retailSnapshot),
                basisLabel
            );
        }
        return null;
    }

    private String buildPricingNote(
        PriceSnapshotDTO wholesaleSnapshot,
        PriceSnapshotDTO retailSnapshot,
        BigDecimal wholesalePerKgPrice,
        BigDecimal retailPerKgPrice
    ) {
        if (wholesalePerKgPrice == null) {
            return "도매 시세 단위를 1kg 기준으로 환산할 수 없어 권장 판매가를 계산하지 않았습니다.";
        }
        if (retailSnapshot == null) {
            return "연결할 소매 시세가 없어 권장 판매가를 계산하지 않았습니다.";
        }
        if (retailPerKgPrice == null) {
            return String.format(
                Locale.KOREAN,
                "소매 시세 단위(%s)가 무게 기준이 아니어서 1kg 환산값과 권장 판매가를 계산하지 않았습니다.",
                resolveEffectiveSnapshotUnit(retailSnapshot)
            );
        }
        return null;
    }

    private String resolveEffectiveSnapshotUnit(PriceSnapshotDTO snapshot) {
        if (snapshot == null) {
            return null;
        }
        return PriceSnapshotUnitSupport.normalizeConvertedRetailWeightUnit(
            snapshot.getItemCode(),
            trimToNull(snapshot.getUnit())
        );
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isDailySnapshot(PriceSnapshotDTO snapshot) {
        String sourceName = trimToNull(snapshot == null ? null : snapshot.getSourceName());
        return sourceName != null && sourceName.startsWith("KAMIS_DAILY");
    }

    private boolean isPeriodSnapshot(PriceSnapshotDTO snapshot) {
        String sourceName = trimToNull(snapshot == null ? null : snapshot.getSourceName());
        return sourceName != null && sourceName.startsWith("KAMIS_PERIOD");
    }

    private String normalizeSearchKey(String value) {
        String trimmedValue = trimToNull(value);
        if (trimmedValue == null) {
            return "";
        }
        return trimmedValue
            .replaceAll("[^0-9A-Za-z\\uAC00-\\uD7A3]", "")
            .toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        if (trimmedValue.isEmpty()) {
            return null;
        }
        String lowercaseValue = trimmedValue.toLowerCase(Locale.ROOT);
        if ("null".equals(lowercaseValue) || "undefined".equals(lowercaseValue) || "nan".equals(lowercaseValue)) {
            return null;
        }
        return trimmedValue;
    }

    private static final class ParsedUnit {

        private final String displayUnit;
        private final BigDecimal quantity;
        private final UnitType unitType;

        private ParsedUnit(String displayUnit, BigDecimal quantity, UnitType unitType) {
            this.displayUnit = displayUnit;
            this.quantity = quantity;
            this.unitType = unitType;
        }

        private String getDisplayUnit() {
            return displayUnit;
        }

        private BigDecimal getQuantity() {
            return quantity;
        }

        private UnitType getUnitType() {
            return unitType;
        }
    }

    private static final class PricingBasis {

        private final String displayUnit;
        private final BigDecimal quantity;
        private final UnitType unitType;
        private final String label;

        private PricingBasis(String displayUnit, BigDecimal quantity, UnitType unitType, String label) {
            this.displayUnit = displayUnit;
            this.quantity = quantity;
            this.unitType = unitType;
            this.label = label;
        }

        private String getDisplayUnit() {
            return displayUnit;
        }

        private BigDecimal getQuantity() {
            return quantity;
        }

        private UnitType getUnitType() {
            return unitType;
        }

        private String getLabel() {
            return label;
        }
    }

    private static final class ResolvedPurchaseQuote {

        private final String purchaseUnit;
        private final BigDecimal purchaseQty;
        private final BigDecimal purchasePrice;

        private ResolvedPurchaseQuote(String purchaseUnit, BigDecimal purchaseQty, BigDecimal purchasePrice) {
            this.purchaseUnit = purchaseUnit;
            this.purchaseQty = purchaseQty;
            this.purchasePrice = purchasePrice;
        }

        private String getPurchaseUnit() {
            return purchaseUnit;
        }

        private BigDecimal getPurchaseQty() {
            return purchaseQty;
        }

        private BigDecimal getPurchasePrice() {
            return purchasePrice;
        }

        private String getPricingBaseUnit() {
            return purchaseUnit;
        }

        private BigDecimal getPricingBaseQty() {
            return purchaseQty;
        }

        private BigDecimal getPricingBasePrice() {
            return purchasePrice;
        }
    }

    private enum UnitType {
        WEIGHT,
        COUNT
    }
}
