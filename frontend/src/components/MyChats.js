import { AddIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState, useCallback } from "react"; // Import useCallback
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Button } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import socket from "../socket";
import "./MyChats.css"; // Import the CSS file

const MyChats = ({ fetchAgain }) => {
  const [loggedUser , setLoggedUser ] = useState();

  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const toast = useToast();

  const fetchChats = useCallback(async () => { // Use useCallback to memoize the function
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  }, [user.token, setChats, toast]); // Add dependencies

  useEffect(() => {
    setLoggedUser (JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain, fetchChats]); // Include fetchChats in the dependency array

  // Add socket listeners for real-time chat updates
  useEffect(() => {
    const handleMessageReceived = (newMessage) => {
      // Update chat list when a new message is received
      fetchChats();
    };

    const handleNewChat = (newChat) => {
      // Add new chat to the list
      setChats(prevChats => [newChat, ...prevChats]);
    };

    // Listen for socket events
    socket.on("message received", handleMessageReceived);
    socket.on("new chat", handleNewChat);

    return () => {
      socket.off("message received", handleMessageReceived);
      socket.off("new chat", handleNewChat);
    };
  }, [fetchChats, setChats]);

  return (
    <Box className="my-chats-container">
      <Box className="my-chats-header">
        My Chats
        <GroupChatModal>
          <Button className="new-group-btn" rightIcon={<AddIcon />}>
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      <Box className="my-chats-list">
        {chats ? (
          <Stack overflowY="scroll">
            {chats.map((chat) => (
              <Box
                className={`chat-item ${selectedChat === chat ? "selected" : ""}`}
                onClick={() => setSelectedChat(chat)}
                key={chat._id}
              >
                <Text>
                  {!chat.isGroupChat
                    ? getSender(loggedUser , chat.users)
                    : chat.chatName}
                </Text>
                {chat.latestMessage && (
                  <Text className="latest-message">
                    <b>{chat.latestMessage.sender.name} :</b>
                    {chat.latestMessage.content.length > 50
                      ? chat.latestMessage.content.substring(0, 51) + "..."
                      : chat.latestMessage.content}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;