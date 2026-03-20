package com.app.service;

public interface MailService {

    void sendTemporaryPasswordEmail(String toEmail, String temporaryPassword);
}
