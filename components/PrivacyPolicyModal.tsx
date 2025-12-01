'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface PrivacyPolicyModalProps {
	open: boolean;
	onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ open, onClose }) => {
	return (
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
					{/* Backdrop */}
					<motion.div
						className="absolute inset-0 bg-neutral-foreground bg-opacity-40"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
					/>
					{/* Bottom-centered Sheet */}
					<motion.div
						className="fixed inset-x-0 bottom-0 mx-auto w-[92vw] sm:w-[85vw] md:w-[75vw] lg:w-[60vw] xl:w-[50vw] max-w-2xl bg-surface text-text-primary rounded-t-2xl shadow-xl p-5 md:p-6 pb-[env(safe-area-inset-bottom)]"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 260, damping: 28 }}
					>
						<div className="relative">
						<button
								aria-label="Close privacy policy"
								onClick={onClose}
							className="absolute right-0 -top-2 bg-neutral-muted-bg text-text-tertiary hover:text-text-primary rounded-full w-8 h-8 flex items-center justify-center shadow"
							>
								<span className="sr-only">Close</span>
								<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
							<h2 className="text-2xl font-semibold mb-3">Privacy Policy</h2>
							<div className="text-lg text-text-secondary space-y-4 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
								<p>We collect only the information needed to process your orders — such as your name, email address, and shipping details — and to notify you about specials or updates if you've opted in. We never sell or share your information with unrelated third parties. Any sharing is limited to trusted service providers who help us run Goodcup, such as payment processors and shipping partners. Your data is stored securely and accessed only by those who need it to serve you.</p>
								<p>This policy may change at any time, and the version you are reading is current as of August 2025. For any privacy-related questions or requests, contact us at <a href="mailto:hello@goodcup.me" className="underline hover:no-underline">hello@goodcup.me</a>.</p>
								<div className="pt-4 mt-4 border-t border-neutral-border">
									<Link href="/policy" className="underline hover:no-underline text-text-primary">
										View full policy page
									</Link>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default PrivacyPolicyModal;


