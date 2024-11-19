import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./SingleChat.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";

const ENDPOINT = `http://localhost:5000`;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typing, setTyping] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]); // Node selection state
  const toast = useToast();
  const { selectedChat, user, setSelectedChat, chats } = ChatState();
  const socketRef = useRef();

  const sendMessageToNodes = async (event) => {
    if (event.key === "Enter" && newMessage && selectedNodes.length > 0) {
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        for (let chatId of selectedNodes) {
          await axios.post(
            "/api/message",
            {
              content: newMessage,
              chatId,
            },
            config
          );
        }

        setNewMessage(""); // Clear the input
        setSelectedNodes([]); // Deselect all nodes
      } catch (error) {
        console.error("Failed to send messages: ", error);
      }
    }
  };


  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
      setMessages(data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  }, [selectedChat, user.token, toast]);

  // Initialize socket
  useEffect(() => {
    socketRef.current = io(ENDPOINT);

    socketRef.current.emit("setup", user);
    socketRef.current.on("connected", () => setSocketConnected(true));

    socketRef.current.on("message received", (newMessageReceived) => {
      if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
        setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user, selectedChat]);

  useEffect(() => {
    fetchMessages();
  }, [selectedChat, fetchMessages]);

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      setTyping(false);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await axios.post(
          "/api/message",
          {
            content: newMessage,
            chatId: selectedChat._id,
          },
          config
        );

        socketRef.current.emit("new message", data);
        setMessages((prevMessages) => [...prevMessages, data]);
        setNewMessage("");
      } catch (error) {
        toast({
          title: "Error Occurred!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socketRef.current.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    const timerLength = 3000;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socketRef.current.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  // Node Selection and Graph Rendering
  const toggleNodeSelection = (chatId) => {
    setSelectedNodes((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#160E2E"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {isTyping ? (
                <div>
                  <Lottie
                    options={{ animationData, loop: true }}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : null}
              <Input
                bg="#E0E0E0"
                _hover={{ cursor: "text" }}
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d="flex" flexDir="column" justifyContent="center" alignItems="center" h="100%">
        <Box className="network-graph" position="relative" height="300px" mb={4}>
  {chats &&
    chats.slice(0, 6).map((chat, index) => {
      const angle = (index / 6) * 2 * Math.PI; // Divide into 6 segments for top 6 chats
      const x = `${50 + Math.cos(angle) * 50}%`;
      const y = `${50 + Math.sin(angle) * 50}%`;

      return (
        <Box
          key={chat._id}
          className={`node ${selectedNodes.includes(chat._id) ? "selected" : ""}`}
          position="absolute"
          top={y}
          left={x}
          backgroundColor={selectedNodes.includes(chat._id) ? "#FF6347" : "#4a90e2"}
          borderRadius="50%"
          width="100px" // Increased node size
          height="100px" // Increased node size
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => toggleNodeSelection(chat._id)}
          cursor="pointer"
          transform="translate(-10%, -10%)"
        >
          <Text color="white" fontSize="md"> {/* Slightly larger font */}
            {chat.isGroupChat ? chat.chatName : chat.users[0].name}
          </Text>
        </Box>
      );
    })}
</Box>
<br/>
        <Text fontSize="xl" fontFamily="Work sans" textAlign="center" ml={20} mt={59}>
          Select nodes to send a message
        </Text>

        <FormControl
          onKeyDown={sendMessageToNodes}
          id="message-input"
          isRequired
          mt={5}
          ml={20}
          w="80%"
        >
          <Input
            bg="#E0E0E0"
            _hover={{ cursor: "text" }}
            placeholder="Enter a message.."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
        </FormControl>
      </Box>
      )}
    </>
  );
};

export default SingleChat;
