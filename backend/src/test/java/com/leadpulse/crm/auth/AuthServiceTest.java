package com.leadpulse.crm.auth;

import com.leadpulse.crm.auth.dto.*;
import com.leadpulse.crm.auth.entity.Role;
import com.leadpulse.crm.auth.entity.User;
import com.leadpulse.crm.auth.repository.UserRepository;
import com.leadpulse.crm.auth.security.JwtTokenProvider;
import com.leadpulse.crm.auth.service.impl.AuthServiceImpl;
import com.leadpulse.crm.common.exception.BadCredentialsException;
import com.leadpulse.crm.common.exception.UserAlreadyExistsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthServiceImpl authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id("usr-101")
                .name("Sarah Jenkins")
                .email("s.jenkins@archicorp.com")
                .password("encoded_password")
                .role(Role.ROLE_PARTNER)
                .title("Managing Partner")
                .department("Executive Board")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Should successfully authenticate user and return JWT token")
    void login_Success() {
        LoginRequest request = new LoginRequest("s.jenkins@archicorp.com", "Password123!");

        when(userRepository.findByEmail("s.jenkins@archicorp.com")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("Password123!", "encoded_password")).thenReturn(true);
        when(jwtTokenProvider.generateTokenFromUsername("s.jenkins@archicorp.com")).thenReturn("mock.jwt.token");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertEquals("s.jenkins@archicorp.com", response.getUser().getEmail());
        assertEquals(Role.ROLE_PARTNER, response.getUser().getRole());
    }

    @Test
    @DisplayName("Should throw BadCredentialsException for invalid password")
    void login_WrongPassword_ThrowsException() {
        LoginRequest request = new LoginRequest("s.jenkins@archicorp.com", "WrongPass");

        when(userRepository.findByEmail("s.jenkins@archicorp.com")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("WrongPass", "encoded_password")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    @DisplayName("Should register new user successfully")
    void register_Success() {
        SignupRequest request = new SignupRequest("Michael Chen", "m.chen@archicorp.com", "Pass123!", Role.ROLE_SENIOR_CONSULTANT, "Senior Consultant", "M&A Strategy");

        when(userRepository.existsByEmail("m.chen@archicorp.com")).thenReturn(false);
        when(passwordEncoder.encode("Pass123!")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId("usr-102");
            return u;
        });

        UserDto dto = authService.register(request);

        assertNotNull(dto);
        assertEquals("Michael Chen", dto.getName());
        assertEquals("m.chen@archicorp.com", dto.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw UserAlreadyExistsException when email registered")
    void register_DuplicateEmail_ThrowsException() {
        SignupRequest request = new SignupRequest("Michael Chen", "s.jenkins@archicorp.com", "Pass123!", Role.ROLE_SENIOR_CONSULTANT, "Senior Consultant", "M&A");

        when(userRepository.existsByEmail("s.jenkins@archicorp.com")).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class, () -> authService.register(request));
    }

    @Test
    @DisplayName("Should generate password reset token")
    void forgotPassword_Success() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("s.jenkins@archicorp.com");

        when(userRepository.findByEmail("s.jenkins@archicorp.com")).thenReturn(Optional.of(sampleUser));

        String token = authService.forgotPassword(request);

        assertNotNull(token);
        assertNotNull(sampleUser.getResetPasswordToken());
        verify(userRepository, times(1)).save(sampleUser);
    }

    @Test
    @DisplayName("Should reset password with valid token")
    void resetPassword_Success() {
        sampleUser.setResetPasswordToken("valid-token");
        sampleUser.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(10));

        ResetPasswordRequest request = new ResetPasswordRequest("valid-token", "NewSecret123!");

        when(userRepository.findByResetPasswordToken("valid-token")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.encode("NewSecret123!")).thenReturn("new_encoded_password");

        String result = authService.resetPassword(request);

        assertEquals("Password successfully reset", result);
        assertNull(sampleUser.getResetPasswordToken());
        verify(userRepository, times(1)).save(sampleUser);
    }
}
