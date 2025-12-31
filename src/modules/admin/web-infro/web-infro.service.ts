import { Injectable } from '@nestjs/common';
import { CreateWebInfroDto } from './dto/create-web-infro.dto';
import { UpdateWebInfroDto } from './dto/update-web-infro.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { v4 as uuidv4 } from 'uuid';
import { CreateTeamInfoDto } from './dto/create-team-info.dto';

@Injectable()
export class WebInfroService {
  constructor(private prisma: PrismaService) {}

  async createAblog(
    createWebInfroDto: CreateWebInfroDto,
    userId: string,
    image: Express.Multer.File,
  ) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!checkUser) {
      throw new Error('User not found');
    }

    if (checkUser.type !== 'admin') {
      throw new Error('Only admins can create a blog');
    }

    const randomName = uuidv4();
    const fileName = `${randomName}-${image.originalname.replace(/\s+/g, '_')}`;

    try {
      await SojebStorage.put(
        appConfig().storageUrl.blog + '/' + fileName,
        image.buffer,
      );
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error('Image upload failed');
    }

    const createBlog = await this.prisma.blog.create({
      data: {
        title: createWebInfroDto.title,
        description: createWebInfroDto.description,
        category: createWebInfroDto.category,
        image: `${appConfig().storageUrl.blog}/${fileName}`,
        user_id: userId,
      },
    });

    return {
      status: 'success',
      message: 'Blog created successfully',
      data: {
        blog: createBlog,
      },
    };
  }

  async createTeam(
    createTeamInfoDto: CreateTeamInfoDto,
    userId: string,
    image: Express.Multer.File,
  ) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!checkUser) {
      throw new Error('User not found');
    }

    if (checkUser.type !== 'admin') {
      throw new Error('Only admins can create a blog');
    }
    const randomName = uuidv4();
    const fileName = `${randomName}-${image.originalname.replace(/\s+/g, '_')}`;

    try {
      await SojebStorage.put(
        appConfig().storageUrl.team + '/' + fileName,
        image.buffer,
      );
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error('Image upload failed');
    }
    const createTeam = await this.prisma.teamMember.create({
      data: {
        name: createTeamInfoDto.name,
        designation: createTeamInfoDto.designation,
        description: createTeamInfoDto.description,
        image: `${appConfig().storageUrl.team}/${fileName}`,
        user_id: userId,
      },
    });

    return {
      status: 'success',
      message: 'Team member created successfully',
    };
  }

  async getAllTeams(userId: string) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!checkUser) {
      throw new Error('User not found');
    }

    if (checkUser.type !== 'admin') {
      throw new Error('Only admins can view team members');
    }
    const teams = await this.prisma.teamMember.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      status: 'success',
      message: 'Teams fetched successfully',
      data: {
        teams,
      },
    };
  }

  async getPublicAllTeams() {
    const teams = await this.prisma.teamMember.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      status: 'success',
      message: 'Teams fetched successfully',
      data: {
        teams,
      },
    };
  }

  async GetAllWebBlogs(userId: string) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!checkUser) {
      throw new Error('User not found');
    }

    if (checkUser.type !== 'admin') {
      throw new Error('Only admins can view blogs');
    }
    const blogs = await this.prisma.blog.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      status: 'success',
      message: 'Blogs fetched successfully',
      data: {
        blogs,
      },
    };
  }

  //  async remove(id: string, userID: string) {
  //   try {
  //     if (!userID) {
  //       throw new Error("User ID is missing.");
  //     }

  //     const admin = await this.prisma.user.findUnique({
  //       where: { id: userID, type: 'admin' },
  //     });

  //     if (!admin) {
  //       return {
  //         success: false,
  //         message: 'Sorry, only admins can remove website info.',
  //       };
  //     }

  //     const blog = await this.prisma.blog.findUnique({
  //       where: { id },
  //     });

  //     if (blog) {
  //       await this.prisma.blog.delete({
  //         where: { id },
  //       });
  //       return {
  //         success: true,
  //         message: `Blog with ID ${id} removed successfully.`,
  //       };
  //     }

  //     const team = await this.prisma.teamMember.findUnique({
  //       where: { id },
  //     });

  //     if (!team) {
  //       return {
  //         success: false,
  //         message: 'Request item not found, neither a blog nor a team member.',
  //       };
  //     }

  //     await this.prisma.teamMember.delete({
  //       where: { id },
  //     });

  //     return {
  //       success: true,
  //       message: `Team member with ID ${id} removed successfully.`,
  //     };

  //   } catch (error) {
  //     console.error('Error during removal:', error);
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }

  async remove(id: string, userID: string) {
    try {
      if (!userID) throw new Error('User ID is missing.');

      const admin = await this.prisma.user.findUnique({
        where: { id: userID, type: 'admin' },
      });

      if (!admin)
        return {
          success: false,
          message: 'Sorry, only admins can remove website info.',
        };

      const blog = await this.prisma.blog.findUnique({ where: { id } });
      const team = blog
        ? null
        : await this.prisma.teamMember.findUnique({ where: { id } });

      return blog
        ? (await this.prisma.blog.delete({ where: { id } }),
          {
            success: true,
            message: `Blog with ID ${id} removed successfully.`,
          })
        : team
          ? (await this.prisma.teamMember.delete({ where: { id } }),
            {
              success: true,
              message: `Team member with ID ${id} removed successfully.`,
            })
          : {
              success: false,
              message:
                'Request item not found, neither a blog nor a team member.',
            };
    } catch (error: any) {
      console.error('Error during removal:', error);
      return { success: false, message: error.message };
    }
  }
}
