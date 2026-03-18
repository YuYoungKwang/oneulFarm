package com.app.dto;

public class DuplicateCheckResponseDto {

    private String value;
    private boolean available;

    public DuplicateCheckResponseDto() {
    }

    public DuplicateCheckResponseDto(String value, boolean available) {
        this.value = value;
        this.available = available;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}
