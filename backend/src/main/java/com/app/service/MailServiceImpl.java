package com.app.service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

import javax.mail.Authenticator;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MailServiceImpl implements MailService {

    @Value("${mail.host:smtp.gmail.com}")
    private String mailHost;

    @Value("${mail.port:587}")
    private String mailPort;

    @Value("${mail.username:}")
    private String mailUsername;

    @Value("${mail.password:}")
    private String mailPassword;

    @Value("${mail.from:}")
    private String mailFrom;

    @Value("${mail.auth:true}")
    private String mailAuth;

    @Value("${mail.starttls.enable:true}")
    private String startTlsEnabled;

    @Value("${mail.starttls.required:true}")
    private String startTlsRequired;

    @Value("${mail.smtp.ssl.trust:smtp.gmail.com}")
    private String sslTrustHost;

    @Value("${mail.smtp.connectiontimeout:10000}")
    private String connectionTimeout;

    @Value("${mail.smtp.timeout:10000}")
    private String timeout;

    @Value("${mail.smtp.writetimeout:10000}")
    private String writeTimeout;

    @Override
    public void sendTemporaryPasswordEmail(String toEmail, String temporaryPassword) {
        validateMailConfig();

        Properties props = new Properties();
        props.put("mail.smtp.host", mailHost);
        props.put("mail.smtp.port", mailPort);
        props.put("mail.smtp.auth", mailAuth);
        props.put("mail.smtp.starttls.enable", startTlsEnabled);
        props.put("mail.smtp.starttls.required", startTlsRequired);
        props.put("mail.smtp.ssl.trust", sslTrustHost);
        props.put("mail.smtp.connectiontimeout", connectionTimeout);
        props.put("mail.smtp.timeout", timeout);
        props.put("mail.smtp.writetimeout", writeTimeout);

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(mailUsername, mailPassword);
            }
        });

        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(resolveFromAddress(), "oneulFarm", StandardCharsets.UTF_8.name()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail, false));
            message.setSubject("[oneulFarm] 임시 비밀번호 안내", StandardCharsets.UTF_8.name());
            message.setText(buildMessageBody(temporaryPassword), StandardCharsets.UTF_8.name());

            Transport.send(message);
        } catch (MessagingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "임시 비밀번호 메일 전송에 실패했습니다.", exception);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "메일 전송 중 오류가 발생했습니다.", exception);
        }
    }

    private String buildMessageBody(String temporaryPassword) {
        return "oneulFarm 임시 비밀번호가 발급되었습니다.\n\n"
            + "임시 비밀번호: " + temporaryPassword + "\n\n"
            + "로그인 후 반드시 비밀번호를 변경해 주세요.";
    }

    private String resolveFromAddress() {
        return isBlank(mailFrom) ? mailUsername : mailFrom;
    }

    private void validateMailConfig() {
        if (isBlank(mailHost) || isBlank(mailPort) || isBlank(mailUsername) || isBlank(mailPassword)) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "메일 서버 설정이 필요합니다. api.properties의 mail 설정을 확인해 주세요."
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
