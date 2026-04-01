package com.app.dto.main;

public class HeroSlideDto {

    private String key;
    private String eyebrow;
    private String title;
    private String desc;
    private String primaryLabel;
    private String primaryHref;
    private String secondaryLabel;
    private String secondaryHref;
    private String imageUrl = "";

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getEyebrow() {
        return eyebrow;
    }

    public void setEyebrow(String eyebrow) {
        this.eyebrow = eyebrow;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getPrimaryLabel() {
        return primaryLabel;
    }

    public void setPrimaryLabel(String primaryLabel) {
        this.primaryLabel = primaryLabel;
    }

    public String getPrimaryHref() {
        return primaryHref;
    }

    public void setPrimaryHref(String primaryHref) {
        this.primaryHref = primaryHref;
    }

    public String getSecondaryLabel() {
        return secondaryLabel;
    }

    public void setSecondaryLabel(String secondaryLabel) {
        this.secondaryLabel = secondaryLabel;
    }

    public String getSecondaryHref() {
        return secondaryHref;
    }

    public void setSecondaryHref(String secondaryHref) {
        this.secondaryHref = secondaryHref;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl == null ? "" : imageUrl;
    }
}
