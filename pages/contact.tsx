import Head from 'next/head';
import Image from 'next/image';

const BUTTON_CLASSES =
  'flex h-16 w-full items-center justify-center whitespace-nowrap rounded-full px-[15%] text-center text-[28px] font-semibold leading-none text-white shadow-sm';

const TIKTOK_ICON_PATH =
  'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.08 2.7 1.57 4.24 1.74v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.45 3.98-2.14 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Add Goodcup to Contacts</title>
      </Head>

      <main className="min-h-[100dvh] bg-white px-6 pt-10">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-10">
          <a
            href="https://goodcup.me"
            aria-label="Visit the Goodcup website"
            className="block leading-none"
          >
            <Image
              src="/media/animated_logo/goodcup-contact-logo.png"
              alt="Goodcup"
              width={888}
              height={829}
              className="h-auto w-[66vw]"
              priority
            />
          </a>

          <a
            href="/api/contact"
            className={`${BUTTON_CLASSES} bg-[#52BBE1] tracking-[0.06em]`}
          >
            SAVE CONTACT
          </a>

          <a
            href="https://www.instagram.com/goodcup.me/"
            aria-label="Follow Goodcup on Instagram"
            className={`${BUTTON_CLASSES} relative bg-[#F77737] tracking-[0.08em]`}
          >
            FOLLOW US
            <svg
              className="absolute right-6 h-[80%] w-auto"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7Zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10Zm-5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm5.5-2.7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
            </svg>
          </a>

          <a
            href="https://www.tiktok.com/@goodcup.me"
            aria-label="Follow Goodcup on TikTok"
            className={`${BUTTON_CLASSES} relative bg-black tracking-[0.08em]`}
          >
            FOLLOW US
            <svg
              className="absolute right-6 h-[80%] w-auto"
              viewBox="-1 -1 26 26"
              aria-hidden="true"
            >
              <path
                d={TIKTOK_ICON_PATH}
                fill="#25F4EE"
                transform="translate(-0.65 0.55)"
              />
              <path
                d={TIKTOK_ICON_PATH}
                fill="#FE2C55"
                transform="translate(0.65 0.55)"
              />
              <path
                d={TIKTOK_ICON_PATH}
                fill="white"
              />
            </svg>
          </a>
        </div>
      </main>
    </>
  );
}
