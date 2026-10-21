import { Body, Controller, Get, NotFoundException, Patch, Req } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AuditService } from '../audit/audit.service';

class SetRoleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail()
  email: string;

  @IsIn(['CUSTOMER', 'FULFILMENT', 'MARKETING', 'ADMIN'])
  role: 'CUSTOMER' | 'FULFILMENT' | 'MARKETING' | 'ADMIN';
}

/** Staff must first create a normal account on the shop; the owner then grants a role here. */
@Roles('ADMIN')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.user.findMany({
      where: { role: { not: 'CUSTOMER' } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  @Patch('role')
  async setRole(@Body() dto: SetRoleDto, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No account uses that email. Ask them to create an account on the shop first.' });
    if (user.id === actor.id) throw new AppException(400, 'CANNOT_CHANGE_OWN_ROLE', 'You can’t change your own role.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: user.id }, data: { role: dto.role }, select: { id: true, name: true, email: true, role: true } });
      // Sign them out everywhere so the new role applies immediately.
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.record({ actorId: actor.id, requestId: req.requestId, action: 'user.role', resourceType: 'User', resourceId: user.id, before: { role: user.role }, after: { role: dto.role } }, tx);
      return u;
    });
    return updated;
  }
}
