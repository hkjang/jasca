import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum UserRole {
    SYSTEM_ADMIN = 'SYSTEM_ADMIN',
    ORG_ADMIN = 'ORG_ADMIN',
    SECURITY_ADMIN = 'SECURITY_ADMIN',
    PROJECT_ADMIN = 'PROJECT_ADMIN',
    DEVELOPER = 'DEVELOPER',
    VIEWER = 'VIEWER',
}

enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
}

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'DEVELOPER', enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: 'ACTIVE', enum: UserStatus })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @ApiPropertyOptional({ example: 'org-uuid-here' })
    @IsOptional()
    @IsString()
    organizationId?: string;
}
