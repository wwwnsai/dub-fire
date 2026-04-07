"use client"

import Image from 'next/image'

import logoLight from '../../photo/logo-light.png'
import logoDark from '../../photo/logo-dark.png'
import BackButton from '@/components/buttons/BackButton';
import { useRouter } from "next/navigation";

export default function LayoutAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const theme = 'light'
    const router = useRouter();
  return (
    <div className='h-screen flex flex-col mx-8 my-12 md:my-8'>
        <div 
            className='flex justify-start'
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
        >
            <BackButton 
              color={theme === 'light' ? 'red' : 'white'} 
              className='flex justify-start'
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.replace("/");
                }
              }}
            />
            {/* <p className='ml-2 sen-regular text-xs text-secondary-light'>go to home</p> */}
        </div>
        <div className='mt-4 h-3/4 flex flex-col'>
          {children}
        </div>
    </div>
  )
}
