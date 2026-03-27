"use client"

import Image from 'next/image'

import logoLight from '../../photo/logo-light.png'
import logoDark from '../../photo/logo-dark.png'
import BackButton from '@/components/buttons/BackButton';

export default function LayoutAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const theme = 'light'
  return (
    <div className='h-screen flex flex-col mx-8 my-12 md:my-8'>
        <div 
            className='flex justify-start'
            onClick={() => window.location.href = '/home'}
        >
            <BackButton 
              color={theme === 'light' ? 'red' : 'white'} 
              className='flex justify-start'
              onClick={() => window.location.href = '/home'}
            />
            {/* <p className='ml-2 sen-regular text-xs text-secondary-light'>go to home</p> */}
        </div>
        <div className='mt-4 h-3/4 flex flex-col'>
          {children}
        </div>
    </div>
  )
}
