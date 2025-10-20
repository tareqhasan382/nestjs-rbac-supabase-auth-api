import { Controller, Post, Body, HttpStatus, UsePipes,ValidationPipe, UploadedFile, UseInterceptors ,BadRequestException} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  BulkCreateUserDto,
  CreateUserDto,
} from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // diskStorage
import * as fs from 'fs';
//import { parse } from 'csv-parse/sync';
import { parse as csvParseSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import type { Express } from 'express';

const ALLOWED_EXTS = ['.csv', '.txt', '.tsv', '.xlsx'];
const ALLOWED_MIMES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function extFromName(name?: string) {
  if (!name) return '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function fileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, acceptFile: boolean) => void,
) {
  const ext = extFromName(file.originalname);
  if (ALLOWED_EXTS.includes(ext) || ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Pass an error instance (BadRequestException will be handled by Nest)
    cb(new BadRequestException(`Unsupported file type: ${file.mimetype} / ${ext}`), false);
  }
}


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
      storage: memoryStorage(),
      fileFilter,                  // <= reject unsupported file types early
      limits: { fileSize: 8_000_000 }, // 8MB limit (adjust)
    }),
  )
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File not provided');

    // determine extension and mime
    const ext = extFromName(file.originalname);
    const mime = file.mimetype;

    try {
      let records: any[] = [];

      if (ext === '.csv' || mime === 'text/csv' || mime === 'text/plain' || ext === '.txt' || ext === '.tsv') {
        // TEXT/CSV -> parse using csv-parse
        const text = file.buffer.toString('utf8');
        // auto-detect delimiter if needed (here we assume comma; you can add detection)
        records = csvParseSync(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } else if (ext === '.xlsx' || mime.includes('spreadsheet')) {
        // XLSX -> parse with xlsx
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
      } else {
        // unsupported (defensive) — you should never hit this because fileFilter blocks it
        throw new BadRequestException('Unsupported file type; please upload CSV, TXT or XLSX.');
      }

      const users = records.map((r: CreateUserDto) => ({
        name: r.name,
        email: r.email,
        password: r.password,
        role: r.role || 'user',
      }));
      // Call your existing bulkRegister (which does validation, dedupe, etc.)
      const result = await this.authService.bulkRegister(users);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'File processed successfully',
        data: result,
      };
    } catch (err: any) {
      console.error('Failed to delete uploaded file', err);
    }
  }

}

