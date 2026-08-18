package com.leadpulse.crm.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leadpulse.crm.auth.controller.AuthController;
import com.leadpulse.crm.auth.dto.*;
import com.leadpulse.crm.auth.entity.Role;
import com.leadpulse.crm.auth.security.JwtAuthenticationFilter;
import com.leadpulse.crm.auth.security.JwtTokenProvider;
import com.leadpulse.crm.auth.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("POST /api/v1/auth/login should return 200 OK with AuthResponse")
    void login_Returns200() throws Exception {
        LoginRequest loginRequest = new LoginRequest("s.jenkins@archicorp.com", "Password123!");
        UserDto userDto = UserDto.builder()
                .id("usr-101")
                .name("Sarah Jenkins")
                .email("s.jenkins@archicorp.com")
                .role(Role.ROLE_PARTNER)
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt.mock.token")
                .tokenType("Bearer")
                .expiresIn(86400)
                .user(userDto)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("jwt.mock.token"))
                .andExpect(jsonPath("$.data.user.email").value("s.jenkins@archicorp.com"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register should return 201 Created")
    void register_Returns201() throws Exception {
        SignupRequest signupRequest = new SignupRequest("Robert Black", "r.black@archicorp.com", "Password123!", Role.ROLE_FINANCIAL_ANALYST, "Financial Analyst", "Analytics");
        UserDto userDto = UserDto.builder()
                .id("usr-103")
                .name("Robert Black")
                .email("r.black@archicorp.com")
                .role(Role.ROLE_FINANCIAL_ANALYST)
                .build();

        when(authService.register(any(SignupRequest.class))).thenReturn(userDto);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Robert Black"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/forgot-password should return 200 OK")
    void forgotPassword_Returns200() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("s.jenkins@archicorp.com");

        when(authService.forgotPassword(any(ForgotPasswordRequest.class))).thenReturn("reset-token-123");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("reset-token-123"));
    }
}
