import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function createDummyUser() {
  try {
    // Connect to localhost since we are running on host machine where port 27017 is mapped
    await mongoose.connect('mongodb://localhost:27017/rydex');
    console.log('Connected to MongoDB');

    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String },
      role: { type: String, default: "user", enum: ["user", "partner", "admin"] },
      isEmailVerified: { type: Boolean, default: false }
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const email = 'dummy@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: 'Dummy User',
        email,
        password: hashedPassword,
        isEmailVerified: true,
        role: 'user'
      });
      await user.save();
      console.log('Dummy user created successfully!');
    } else {
      user.password = hashedPassword;
      user.isEmailVerified = true;
      await user.save();
      console.log('Dummy user updated with default password!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createDummyUser();
