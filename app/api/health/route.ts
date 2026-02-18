import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const dbTime = await prisma.$queryRaw`SELECT NOW() as time`
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      dbTime: dbTime[0].time,
      message: " Money Transfer App API is working!"
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      help: "Check database connection in .env file"
    }, { status: 500 })
  }
}
