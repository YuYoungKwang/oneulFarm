package com.app.dto.main;

public class BannerDto {

    private Long bannerNo;
    private String title;
    private String imageUrl; // /api/image/banner/{id}
    private String linkUrl;

    public Long getBannerNo() {
        return bannerNo;
    }

    public void setBannerNo(Long bannerNo) {
        this.bannerNo = bannerNo;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getLinkUrl() {
        return linkUrl;
    }

    public void setLinkUrl(String linkUrl) {
        this.linkUrl = linkUrl;
    }
}