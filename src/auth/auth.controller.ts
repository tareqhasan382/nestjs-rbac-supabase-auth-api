import { Controller, Post, Body, HttpStatus, UsePipes,ValidationPipe, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  BulkCreateUserDto,
  CreateUserDto,
} from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import type { Express } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}


 
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.register(createUserDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'User created successfully',
      data: result,
    };
  }
  @Post('bulk-register')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async bulkRegister(@Body() bulkDto: BulkCreateUserDto) {
    console.log("bulkDto------------->", bulkDto);
    const result = await this.authService.bulkRegister(bulkDto.users);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Bulk import processed',
      data: result,
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    const token = this.authService.login(user);
    return {
      statusCode: HttpStatus.OK,
      message: 'User logged in successfully',
      data: {
        accessToken: token,
      },
    };
  }

  @Post('bulk-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('File not provided');
    }
    const content = fs.readFileSync(file.path, 'utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
//  Map into DTO structure
    const users = records.map((r: CreateUserDto) => ({
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role || 'user',
    }));
    const result = await this.authService.bulkRegister(users);
    //  Clean up uploaded file
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      // ignore unlink error but log in real app
      console.warn('Failed to delete uploaded file', err);
    }

    return {
      statusCode: HttpStatus.CREATED,
      message: 'File processed successfully',
      data: result,
    };
  }

}

