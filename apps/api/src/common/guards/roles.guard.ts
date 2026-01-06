import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Permission to role mapping for API tokens
// Maps actual permission strings from DB to roles required by endpoints
const PERMISSION_ROLE_MAP: Record<string, string[]> = {
    // Scan permissions
    'scans:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'scans:write': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN'],
    'scan:upload': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN'],
    'scan:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    // Project permissions
    'projects:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'projects:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    'project:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'project:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    // Vulnerability permissions
    'vulnerabilities:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'vulnerabilities:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    'vuln:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'vuln:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    // Report permissions
    'reports:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'reports:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    'report:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'report:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    // Policy permissions
    'policies:read': ['DEVELOPER', 'PROJECT_ADMIN', 'ORG_ADMIN', 'VIEWER'],
    'policies:write': ['PROJECT_ADMIN', 'ORG_ADMIN'],
    // Admin
    'admin': ['ORG_ADMIN'],
};

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            return false;
        }

        // Handle API token authentication
        if (user.isApiToken && user.permissions) {
            // Check if any of the API token's permissions grant the required roles
            for (const permission of user.permissions) {
                const grantedRoles = PERMISSION_ROLE_MAP[permission] || [];
                if (requiredRoles.some(role => grantedRoles.includes(role))) {
                    return true;
                }
            }
            
            // For API tokens, also check if 'admin' permission is present
            if (user.permissions.includes('admin')) {
                return true;
            }
            
            return false;
        }

        // Original JWT-based role check
        if (!user.roles) {
            return false;
        }

        const userRoles = user.roles.map((r: any) => r.role);

        // Admin hierarchy
        if (userRoles.includes('SYSTEM_ADMIN')) {
            return true;
        }

        if (requiredRoles.includes('ORG_ADMIN') && userRoles.includes('ORG_ADMIN')) {
            return true;
        }

        return requiredRoles.some((role) => userRoles.includes(role));
    }
}
