package com.leadpulse.crm.auth.dto;

import com.leadpulse.crm.auth.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private String id;
    private String name;
    private String email;
    private Role role;
    private String title;
    private String avatarUrl;
    private String department;
    private Boolean active;
}
