import { ApiProperty } from '@nestjs/swagger';

class UserSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() role: string;
  @ApiProperty() tenantId: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15 minutes)' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived refresh token (7 days)' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token lifetime', example: '15m' })
  expiresIn: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}
