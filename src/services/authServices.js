const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");
const { UsersRepository } = require("../repositories/authRepository");
const { RolesRepository } = require("../repositories/rolesRepository");
const {
  RolesAndStaffRepository,
} = require("../repositories/roleandstaffRepository"); // include if needed

class AuthService {
  constructor(
    userRepo = new UsersRepository(),
    roleRepo = new RolesRepository(),
    rolesandstaff = new RolesAndStaffRepository(),
  ) {
    this.userRepo = userRepo;
    this.roleRepo = roleRepo;
    this.rolesandstaff = rolesandstaff;
  }

  // Hash a password
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  // Compare password with hash
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  // Register a new user
  async register(data, role) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new Error("Email already exists");

    const now = new Date();

    const hashed = await this.hashPassword(data.password);
    const roleId = await this.roleRepo.findActiveRoleIdByName(role);

    if (!roleId) {
      throw new Error("Role not found");
    }

    // 👇 await + returns ID
    await this.userRepo.create({
      ...data,
      password: hashed,
      created_at: now,
      updated_at: now,
      is_active: 1, // ✅ BIT
      is_deleted: 0, // ✅ BIT
    });
    const userId = await this.userRepo.findByEmailReturnId(data.email);

    console.log(userId);
    return await this.rolesandstaff.create({
      role_id: roleId,
      user_id: userId.user_id,
      created_at: now,
      updated_at: now,
      is_deleted: 0,
    });
  }

  // Update password
  async updatePassword(password, email) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepo.update(user.user_id, {
      password: hashedPassword,
      updated_at: new Date().toISOString(),
    });
  }

  // Login user
  async login(email, password) {
    const user = await this.userRepo.findByEmail(email);
    const retrieveRoleId = await this.roleRepo.retrieveRoleByEmail(email);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.is_active) {
      throw new Error("User account is inactive");
    }

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = this.generateToken({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_role: retrieveRoleId,
    });

    return {
      token,
    };
  }
}

module.exports = AuthService;
