import { Global, Module } from '@nestjs/common';
import { EmailSender } from './email.sender';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { OrderNotifier } from './order-notifier';
import { ServiceNotifier } from './service-notifier';

@Global()
@Module({ providers: [OutboxService, OutboxWorker, EmailSender, OrderNotifier, ServiceNotifier], exports: [OutboxService, OrderNotifier, ServiceNotifier] })
export class NotificationsModule {}
