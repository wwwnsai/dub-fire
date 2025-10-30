"use client"

import Image from 'next/image'

import logoLight from '../../photo/logo-light.png'
import logoDark from '../../photo/logo-dark.png'
import BackButton from '@/component/buttons/BackButton';

export default function LayoutAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const theme = 'light'
  return (
    <div className='h-screen flex flex-col mx-8 my-12'>
        <button 
            className='flex justify-start'
            onClick={() => window.location.href = '/home'}
        >
            <BackButton color={theme === 'light' ? 'red' : 'white'} />
            <p className='ml-2 sen-regular text-xs text-secondary-light'>go to home</p>
        </button>
        <div className='flex justify-center items-center mx-auto my-2 w-20 h-20'>
            {theme === 'light' ? (
              <Image src={logoLight} alt="Logo Light" />
            ) : (
              <Image src={logoDark} alt="Logo Dark" />
            )}
        </div>
        <div className='mt-10'>
            {children}
        </div>
    </div>
  )
}
