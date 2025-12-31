import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { DateHelper } from '../../../common/helper/date.helper';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  async create(createContactDto: CreateContactDto) {
    try {
      const data = {};
      if (createContactDto.first_name) {
        data['first_name'] = createContactDto.first_name;
      }
      if (createContactDto.last_name) {
        data['last_name'] = createContactDto.last_name;
      }
      if (createContactDto.email) {
        data['email'] = createContactDto.email;
      }
      if (createContactDto.phone_number) {
        data['phone_number'] = createContactDto.phone_number;
      }
      if (createContactDto.message) {
        data['message'] = createContactDto.message;
      }

      await this.prisma.contact.create({
        data: {
          ...data,
          updated_at: DateHelper.now(),
        },
      });

      const admins = await this.prisma.user.findMany({
        where: { type: 'admin' },
      });

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          const adminNotificationPayload: any = {
            sender_id: '',
            receiver_id: admin.id,
            text: `A new contact message has been received. from ${createContactDto.first_name} ${createContactDto.last_name} email: ${createContactDto.email}`,
            type: 'contact_message',
          };

          const userSocketId = this.messageGateway.clients.get(admin.id);

          if (userSocketId) {
            this.messageGateway.server
              .to(userSocketId)
              .emit('notification', adminNotificationPayload);
            console.log(`Notification sent to user ${admin.id}`);
          } else {
            console.log(
              `User ${admin.id} is not connected, notification will be sent later.`,
            );
          }

          NotificationRepository.createNotification(adminNotificationPayload);
        }
      }

      return {
        success: true,
        message: 'Contact created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll({ q = null, status = null }: { q?: string; status?: number }) {
    try {
      const whereClause = {};
      if (q) {
        whereClause['OR'] = [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone_number: { contains: q, mode: 'insensitive' } },
        ];
      }
      if (status) {
        whereClause['status'] = Number(status);
      }

      const contacts = await this.prisma.contact.findMany({
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          message: true,
        },
      });
      return {
        success: true,
        data: contacts,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          message: true,
        },
      });
      return {
        success: true,
        data: contact,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    try {
      const data = {};
      if (updateContactDto.first_name) {
        data['first_name'] = updateContactDto.first_name;
      }
      if (updateContactDto.last_name) {
        data['last_name'] = updateContactDto.last_name;
      }
      if (updateContactDto.email) {
        data['email'] = updateContactDto.email;
      }
      if (updateContactDto.phone_number) {
        data['phone_number'] = updateContactDto.phone_number;
      }
      if (updateContactDto.message) {
        data['message'] = updateContactDto.message;
      }

      await this.prisma.contact.update({
        where: { id },
        data: {
          ...data,
          updated_at: DateHelper.now(),
        },
      });
      return {
        success: true,
        message: 'Contact updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.contact.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Contact deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
