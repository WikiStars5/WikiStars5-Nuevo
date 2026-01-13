import type { SVGProps } from 'react';
import Image from 'next/image';

export function Logo(props: React.ComponentProps<typeof Image>) {
  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528"
      alt="WikiStars5 Logo"
      width={24}
      height={24}
      {...props}
    />
  );
}
