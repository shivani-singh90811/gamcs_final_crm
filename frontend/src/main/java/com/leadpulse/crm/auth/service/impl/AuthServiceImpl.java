package com.leadpulse.crm.auth.service.impl;

import com.leadpulse.crm.auth.dto.*;
import com.leadpulse.crm.auth.entity.Role;
import com.leadpulse.crm.auth.entity.User;
import com.leadpulse.crm.auth.repository.UserRepository;
import com.leadpulse.crm.auth.security.JwtTokenProvider;
import com.leadpulse.crm.auth.service.AuthService;
import com.leadpulse.crm.common.exception.BadCredentialsException;
import com.leadpulse.crm.common.exception.InvalidTokenException;
import com.leadpulse.crm.common.exception.ResourceNotFoundException;
import com.leadpulse.crm.common.exception.UserAlreadyExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password credentials");
        }

        if (!user.getActive()) {
            throw new BadCredentialsException("User account is inactive");
        }

        String token = jwtTokenProvider.generateTokenFromUsername(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    @Override
    @Transactional
    public UserDto register(SignupRequest request) {
        String email = request.getEmail().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("User already exists with email: " + email);
        }

        Role assignedRole = request.getRole() != null ? request.getRole() : Role.ROLE_SENIOR_CONSULTANT;

        User user = User.builder()
                .name(request.getName())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .title(request.getTitle() != null ? request.getTitle() : assignedRole.getDescription())
                .department(request.getDepartment() != null ? request.getDepartment() : "Executive Advisory")
                .avatarUrl("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150")
                .active(true)
                .build();

        User saved = userRepository.save(user);
        return mapToUserDto(saved);
    }

    @Override
    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("No account found registered with email: " + request.getEmail()));

        String resetToken = UUID.randomUUID().toString();
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        // Simulated email sending log
        return resetToken;
    }

    @Override
    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetPasswordToken(request.getResetToken())
                .orElseThrow(() -> new InvalidTokenException("Invalid password reset token"));

        if (user.getResetPasswordTokenExpiry() == null || user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("Password reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);

        return "Password successfully reset";
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found for email: " + email));
        return mapToUserDto(user);
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .title(user.getTitle())
                .avatarUrl(user.getAvatarUrl())
                .department(user.getDepartment())
                .active(user.getActive())
                .build();
    }
}
