"use client"

import Layout from "@/component/Layout"
import Image from "next/image"
import BackButton from "@/component/buttons/BackButton";

export default function page() {
  return (
    <main className="min-h-screen flex flex-col bg-background-light px-6 py-8">
      <div className="flex items-center mb-4">
        <button
            className="flex justify-start"
            onClick={() => window.history.back()}
        >
            <BackButton color="orange" />
        </button>
        <h1 className="flex mx-auto items-center sen-regular text-xl text-text-secondary">
            Profile
        </h1>
      </div>
    </main>
  )
}
