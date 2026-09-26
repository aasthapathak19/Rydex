import mongoose, { Document } from "mongoose";

export interface IUser extends Document{
name:string;
email:string;
password?:string;
role:"user" | "partner" | "admin"
isEmailVerified?:boolean
otp?:string,
otpExpiresAt?:Date
partnerOnBoardingSteps:number
partnerApplicationSubmittedAt?:Date
mobileNumber?:string
partnerStatus:"pending" | "approved" | "rejected"
rejectionReason?:string
socketId:string |null
location?:{
    type:"Point",
    coordinates:[number,number]
}
isOnline:boolean
createdAt:Date;
updatedAt:Date;
}

const userSchema=new mongoose.Schema<IUser>({
name:{
    type:String,
    required:true
},
email:{
   type:String,
    required:true,
    unique:true 
},
password:{
    type:String,
},
role:{
    type:String,
    default:"user",
    enum:["user","partner","admin"]
},
isEmailVerified:{
    type:Boolean,
    default:false
},
partnerOnBoardingSteps:{
    type:Number,
    min:0,
    max:3,
    default:0
},
partnerApplicationSubmittedAt:{ type:Date },
mobileNumber:{
type:String
},
partnerStatus:{
type:String,
enum:["pending","approved","rejected"],
default:"pending"
},
rejectionReason:{
type:String
},
otp:{
    type:String
},
otpExpiresAt:{
    type:Date
},
socketId:{
    type:String,
    default:null
},
location:{
    type:{
        type:String,
        enum:["Point"]
    },
    coordinates:[Number]
}
,
isOnline:{
    type:Boolean,
    default:false,
    index:true
}

},{timestamps:true})

userSchema.set("toJSON", { transform: (_doc, ret) => {
    const allowed = ["_id", "name", "email", "role", "mobileNumber", "partnerStatus", "partnerOnBoardingSteps", "partnerApplicationSubmittedAt", "rejectionReason", "isEmailVerified", "isOnline", "createdAt", "updatedAt"]
    return Object.fromEntries(Object.entries(ret).filter(([key]) => allowed.includes(key)))
} })

userSchema.index({location:"2dsphere"})

const User=mongoose.models.User || mongoose.model("User",userSchema)
export default User
