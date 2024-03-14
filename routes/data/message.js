import express from 'express';
import User from '../../models/User.js';
import { Message, Conversation } from '../../models/Message.js';
import getUserId from '../../utility/getUserId.js';

const router = express.Router();

router.get('/:chatUser', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.json({ success: false, status: "Login to continue." });
        }

        const loggedUserId = await getUserId(req.cookies.jwt);
        const chatUserId = req.params.chatUser;

        // Check if the logged-in user exists
        const loggedInUser = await User.findById(loggedUserId);
        if (!loggedInUser) {
            return res.json({ success: false, status: "Logged-in user not found." });
        }

        // Check if the chat user exists
        const chatUser = await User.findById(chatUserId);
        if (!chatUser) {
            return res.json({ success: false, status: "Chat user not found." });
        }

        // Find the conversation between the logged-in user and the chat user
        const conversation = await Conversation.findOne({
            participants: { $all: [loggedUserId, chatUserId] }
        });

        // If no conversation found, return an empty array of messages
        if (!conversation) {
            return res.json({ success: true, messages: [], status: "No conversation found with the specified user." });
        }

        // Fetch all messages in the conversation
        const allMessages = await Message.find({ _id: { $in: conversation.messages } }).sort({ timestamp: 1 });

        res.json({ success: true, messages: allMessages });
    } catch (error) {
        console.error(error);
        res.json({ success: false, status: "Something went wrong." });
    }
});


router.get('/unread/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const messages = await Message.find({
            receiver: userId,
            read: false
        }, {
            _id: true
        });

        res.json({ success: true, unReadMessagesCount: messages.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, status: "Something went wrong." });
    }
});


router.put('/read', async (req, res) => {
    try {
        const { messageId } = req.body;

        await Message.findByIdAndUpdate(messageId, {
            read: true
        })
        res.json({ success: true, message: "Message marked as read." });
    } catch (error) {
        console.error(error);
        res.json({ success: false, status: "Something went wrong." });
    }
});

router.put('/save', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.json({ success: false, status: "Login to continue." });
        }

        const loggedUserId = await getUserId(req.cookies.jwt);
        const { sender, receiver, content } = req.body;

        const newMessage = new Message({
            content,
            sender,
            receiver,
        });

        await newMessage.save();

        // Find the logged-in user
        const senderData = await User.findById(loggedUserId);
        const receiverData = await User.findById(loggedUserId);

        if (!senderData || !receiverData) {
            return res.json({ success: false, status: "Either logged sender or receiver not found." });
        }

        // Check if there is an existing conversation between the sender and the receiver
        const existingConversation = await Conversation.findOne({
            participants: { $all: [sender, receiver] }
        });

        if (existingConversation) {
            // If conversation exists, add the new message to it
            existingConversation.messages.push(newMessage._id);
            await existingConversation.save();
        } else {
            // If conversation does not exist, create a new conversation
            const newConversation = new Conversation({
                participants: [sender, receiver],
                messages: [newMessage._id],
            });
            await newConversation.save();
            senderData.conversations.push(newConversation._id);
            receiverData.conversations.push(newConversation._id);
        }

        await senderData.save();
        await receiverData.save();

        res.json({ success: true, message: newMessage, status: "Message saved successfully." });
    } catch (error) {
        console.error(error);
        res.json({ success: false, status: "Something went wrong." });
    }
});

export default router;
