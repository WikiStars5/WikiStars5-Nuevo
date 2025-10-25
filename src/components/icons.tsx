import type { SVGProps } from 'react';
import Image from 'next/image';

export function Logo(props: React.ComponentProps<typeof Image>) {
  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6"
      alt="WikiStars5 Logo"
      width={24}
      height={24}
      {...props}
    />
  );
}
