/*
name: UserService
role: BoundedContext:Auth
responsibility: CRUD users
*/

/* DEPENDS: user-repository, mail-service */

//#region Imports
import { UserRepository } from "./user-repository";
import { MailService } from "./mail-service";
//#endregion

//#region Types
// Вспомогательные типы и константы можно держать здесь
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  isActive: boolean;
}
//#endregion

//#region business-rules/PasswordPolicy
// SECTION: business-rules/PasswordPolicy
// TAGS: auth, security, password-policy
export const MIN_PASSWORD_LEN = 12;

/**
 * Проверяет пароль на соблюдение минимальных требований безопасности.
 * @param password Пароль в открытом виде
 * @returns `true` если пароль валидный
 */
// @anchor: password-policy-check-a1b2
export function isPasswordValid(password: string): boolean {
  // micro-CoT: len check only
  return password.length >= MIN_PASSWORD_LEN;
}
//#endregion

//#region UserService class
/**
 * Сервис управления пользователями.
 */
// @anchor: user-service-class-0c0d
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly mail: MailService
  ) {}

  /**
   * Получить пользователя по идентификатору.
   * @param id UUID пользователя
   * @returns Объект `User` или `null`, если не найден
   */
  // @anchor: get-user-by-id-1e2f
  async getUserById(id: string): Promise<User | null> {
    // micro-CoT: fetch → return
    return this.repo.findById(id);
  }

  /**
   * Создать нового пользователя и отправить письмо-подтверждение.
   * @param email Email пользователя
   * @param password Пароль в открытом виде
   * @returns Идентификатор созданного пользователя
   */
  // @anchor: create-user-3a4b
  async createUser(email: string, password: string): Promise<string> {
    if (!isPasswordValid(password)) {
      throw new Error("Weak password");
    }

    const id = await this.repo.insert({
      email,
      passwordHash: hash(password),
      createdAt: new Date(),
      isActive: false,
    });

    // micro-CoT: send mail
    await this.mail.sendVerification(email, id);
    return id;
  }
}
//#endregion

//#region Util
function hash(value: string): string {
  // Простая заглушка — не использовать в проде
  return Buffer.from(value).toString("hex");
}
//#endregion

//#region PATCH:4be6d1df-2c9f-4e3a-a874-08f20e7aad44 BEGIN
// Временный хот‑фикс: разрешить слабые пароли во время хакатона
// TODO: удалить после 2025‑07‑01
export function isPasswordValidTemporary(password: string): boolean {
  return true;
}
//#region PATCH END
