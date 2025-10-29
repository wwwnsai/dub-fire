"use client"

import Layout from "@/component/Layout"
import Image from "next/image"
import BackButton from "@/component/buttons/BackButton";
import pfp from '@/photo/pfp.jpg'
import InfoCards from "@/component/cards/InfoCards";

export default function page() {
  return (
    <main className="min-h-screen flex flex-col bg-background-light px-6 pt-6 pb-4">
        <div className="grid grid-cols-3 items-center mb-4">
        <button
            className="flex justify-start"
            onClick={() => window.history.back()}
        >
            <BackButton color="orange" />
        </button>

        <h1 className="justify-self-center sen-regular text-xl text-text-secondary">
            Profile
        </h1>

        </div>
        <div className="flex flex-col items-center justify-center mt-8">
            <div className="w-28 h-28 relative rounded-full overflow-hidden">
                <Image
                    src={pfp}
                    alt="User Profile Picture"
                    fill
                    className="object-cover"
                />
            </div>
            <button 
                className="flex justify-center items-center bg-[#FAE4CF] w-20 h-6 mt-6 rounded-full hover:cursor-pointer"
                onClick={() => alert('Change profile picture functionality coming soon!')}
            >
                <p className="sen-regular text-secondary-light text-sm">change</p>
            </button>
        </div>
        <div className="mt-10">
            <InfoCards />
        </div>
    </main>
  )
}
