import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe an email to the newsletter (public)' })
  async subscribe(@Body() body: SubscribeDto) {
    // Basic honeypot: if filled, pretend success without storing
    if (body.honeypot && body.honeypot.trim() !== '') {
      return { message: 'You are subscribed.' };
    }
    return this.newsletterService.subscribe(body.email);
  }
}
