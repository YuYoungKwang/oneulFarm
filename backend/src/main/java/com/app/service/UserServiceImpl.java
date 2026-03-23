package com.app.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.UserDao;
import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.CurrentPasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserDto;
import com.app.dto.UserProfileDto;

@Service
public class UserServiceImpl implements UserService {

    private static final Path PROFILE_IMAGE_DIRECTORY = Paths.get("D:/fileStorage/profile");

    @Autowired
    private UserDao userDao;

    @Override
    public UserProfileDto getMyProfile(Long userNo) {
        UserProfileDto profile = userDao.findMyProfile(userNo);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        if (profile.getTotalSavedAmount() == null) {
            profile.setTotalSavedAmount(BigDecimal.ZERO);
        }

        return profile;
    }

    @Override
    public UserProfileDto updateMyProfile(Long userNo, UpdateUserProfileRequestDto request) {
        validateProfileRequest(request);

        if (userDao.countByEmail(request.getEmail(), userNo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        }

        if (userDao.countByNickname(request.getNickname(), userNo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 닉네임입니다.");
        }

        int updatedCount = userDao.updateMyProfile(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        return getMyProfile(userNo);
    }

    @Override
    @Transactional
    public UserProfileDto updateProfileImage(Long userNo, MultipartFile profileImage) {
        validateProfileImage(profileImage);

        UserProfileDto currentProfile = getMyProfile(userNo);
        String originalFilename = profileImage.getOriginalFilename();
        String extension = extractExtension(originalFilename);
        String storedFileName = "user-" + userNo + "-" + UUID.randomUUID() + extension;

        try {
            Files.createDirectories(PROFILE_IMAGE_DIRECTORY);
            Path targetPath = PROFILE_IMAGE_DIRECTORY.resolve(storedFileName);
            Files.copy(profileImage.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            UserDto imageInfo = new UserDto();
            imageInfo.setProfileImageUrl("/fileStorage/profile/" + storedFileName);
            imageInfo.setProfileImageName(originalFilename);
            imageInfo.setProfileImageExt(extension);
            imageInfo.setProfileImageMimeType(profileImage.getContentType());
            imageInfo.setProfileImageSize(profileImage.getSize());

            int updatedCount = userDao.updateProfileImage(userNo, imageInfo);
            if (updatedCount == 0) {
                Files.deleteIfExists(targetPath);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
            }

            deleteStoredProfileImage(currentProfile.getProfileImageUrl());
            return getMyProfile(userNo);
        } catch (IOException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "프로필 사진을 저장하지 못했습니다."
            );
        }
    }

    @Override
    @Transactional
    public void changePassword(Long userNo, ChangePasswordRequestDto request) {
        validatePasswordRequest(request);

        if (userDao.countByPassword(userNo, request.getCurrentPassword()) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        int updatedCount = userDao.updatePassword(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 변경에 실패했습니다.");
        }
    }

    @Override
    @Transactional
    public void withdrawMyAccount(Long userNo, CurrentPasswordRequestDto request) {
        validateWithdrawRequest(request);

        if (userDao.countByPassword(userNo, request.getCurrentPassword()) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        int updatedCount = userDao.updateStatusToWithdrawn(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원 탈퇴 처리에 실패했습니다.");
        }
    }

    @Override
    public DuplicateCheckResponseDto checkEmail(Long userNo, String email) {
        String normalizedEmail = normalize(email);
        return new DuplicateCheckResponseDto(normalizedEmail, userDao.countByEmail(normalizedEmail, userNo) == 0);
    }

    @Override
    public DuplicateCheckResponseDto checkNickname(Long userNo, String nickname) {
        String normalizedNickname = normalize(nickname);
        return new DuplicateCheckResponseDto(normalizedNickname, userDao.countByNickname(normalizedNickname, userNo) == 0);
    }

    private void validateProfileRequest(UpdateUserProfileRequestDto request) {
        if (request == null
            || isBlank(request.getNickname())
            || isBlank(request.getEmail())
            || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임, 이메일, 연락처는 필수입니다.");
        }

        request.setNickname(normalize(request.getNickname()));
        request.setEmail(normalize(request.getEmail()));
        request.setPhone(normalize(request.getPhone()));
    }

    private void validatePasswordRequest(ChangePasswordRequestDto request) {
        if (request == null
            || isBlank(request.getCurrentPassword())
            || isBlank(request.getNewPassword())
            || isBlank(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
        }

        request.setCurrentPassword(request.getCurrentPassword().trim());
        request.setNewPassword(request.getNewPassword().trim());
        request.setConfirmPassword(request.getConfirmPassword().trim());

        if (request.getNewPassword().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 8자 이상이어야 합니다.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }
    }

    private void validateWithdrawRequest(CurrentPasswordRequestDto request) {
        if (request == null || isBlank(request.getCurrentPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원 탈퇴를 위해 현재 비밀번호를 입력해 주세요.");
        }

        request.setCurrentPassword(request.getCurrentPassword().trim());
    }

    private void validateProfileImage(MultipartFile profileImage) {
        if (profileImage == null || profileImage.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 프로필 사진을 선택해 주세요.");
        }

        String contentType = profileImage.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일만 등록할 수 있습니다.");
        }

        if (profileImage.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로필 사진은 5MB 이하만 등록할 수 있습니다.");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }

        return filename.substring(filename.lastIndexOf('.'));
    }

    private void deleteStoredProfileImage(String profileImageUrl) {
        if (profileImageUrl == null || !profileImageUrl.startsWith("/fileStorage/profile/")) {
            return;
        }

        String fileName = profileImageUrl.substring("/fileStorage/profile/".length());
        if (fileName.isEmpty()) {
            return;
        }

        try {
            Files.deleteIfExists(PROFILE_IMAGE_DIRECTORY.resolve(fileName));
        } catch (IOException ignored) {
            // Old image cleanup is best-effort only.
        }
    }
}
