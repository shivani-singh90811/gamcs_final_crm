package com.leadpulse.crm.auth.service;

import com.leadpulse.crm.auth.dto.*;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    UserDto register(SignupRequest request);

    String forgotPassword(ForgotPasswordRequest request);

    String resetPassword(ResetPasswordRequest request);

    UserDto getCurrentUser(String email);
}
