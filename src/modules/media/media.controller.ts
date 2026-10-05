import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MediaService, UploadScope } from "./media.service";

const uploadScopes: UploadScope[] = ["products", "services", "opportunities"];

@UseGuards(JwtAuthGuard)
@Controller("admin/uploads")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post("images/:scope")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadImage(@Param("scope") scope: string, @UploadedFile() file?: Express.Multer.File) {
    if (!uploadScopes.includes(scope as UploadScope)) {
      throw new BadRequestException("Unsupported image upload scope");
    }
    if (!file) throw new BadRequestException("Select an image to upload");
    return this.mediaService.uploadImage(scope as UploadScope, file);
  }
}
