import { relations } from "drizzle-orm/relations";
import { user, contractPurchase, contractReview, suggestion, document, chat, messageV2, message, ticket, contractReviewRequest, lawyerMessage, wallet, walletTransaction, voteV2, vote, stream } from "./schema";

export const contractPurchaseRelations = relations(contractPurchase, ({one}) => ({
	user: one(user, {
		fields: [contractPurchase.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	contractPurchases: many(contractPurchase),
	contractReviews: many(contractReview),
	suggestions: many(suggestion),
	tickets: many(ticket),
	chats: many(chat),
	documents: many(document),
}));

export const contractReviewRelations = relations(contractReview, ({one}) => ({
	user: one(user, {
		fields: [contractReview.userId],
		references: [user.id]
	}),
}));

export const suggestionRelations = relations(suggestion, ({one}) => ({
	user: one(user, {
		fields: [suggestion.userId],
		references: [user.id]
	}),
	document: one(document, {
		fields: [suggestion.documentId],
		references: [document.id]
	}),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	suggestions: many(suggestion),
	user: one(user, {
		fields: [document.userId],
		references: [user.id]
	}),
}));

export const messageV2Relations = relations(messageV2, ({one, many}) => ({
	chat: one(chat, {
		fields: [messageV2.chatId],
		references: [chat.id]
	}),
	voteV2s: many(voteV2),
}));

export const chatRelations = relations(chat, ({one, many}) => ({
	messageV2s: many(messageV2),
	messages: many(message),
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	voteV2s: many(voteV2),
	votes: many(vote),
	streams: many(stream),
}));

export const messageRelations = relations(message, ({one, many}) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	}),
	votes: many(vote),
}));

export const ticketRelations = relations(ticket, ({one}) => ({
	user: one(user, {
		fields: [ticket.userId],
		references: [user.id]
	}),
}));

export const lawyerMessageRelations = relations(lawyerMessage, ({one}) => ({
	contractReviewRequest: one(contractReviewRequest, {
		fields: [lawyerMessage.reviewRequestId],
		references: [contractReviewRequest.id]
	}),
}));

export const contractReviewRequestRelations = relations(contractReviewRequest, ({many}) => ({
	lawyerMessages: many(lawyerMessage),
}));

export const walletTransactionRelations = relations(walletTransaction, ({one}) => ({
	wallet: one(wallet, {
		fields: [walletTransaction.walletId],
		references: [wallet.id]
	}),
}));

export const walletRelations = relations(wallet, ({many}) => ({
	walletTransactions: many(walletTransaction),
}));

export const voteV2Relations = relations(voteV2, ({one}) => ({
	chat: one(chat, {
		fields: [voteV2.chatId],
		references: [chat.id]
	}),
	messageV2: one(messageV2, {
		fields: [voteV2.messageId],
		references: [messageV2.id]
	}),
}));

export const voteRelations = relations(vote, ({one}) => ({
	chat: one(chat, {
		fields: [vote.chatId],
		references: [chat.id]
	}),
	message: one(message, {
		fields: [vote.messageId],
		references: [message.id]
	}),
}));

export const streamRelations = relations(stream, ({one}) => ({
	chat: one(chat, {
		fields: [stream.chatId],
		references: [chat.id]
	}),
}));