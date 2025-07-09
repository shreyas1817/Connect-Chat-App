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
import socket, { createSocket, reconnectSocket } from "../socket";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typing, setTyping] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]); // Node selection state
  const [rockets, setRockets] = useState([]); // Rocket animations state
  const toast = useToast();
  const { selectedChat, user, setSelectedChat, chats, setNotification } = ChatState();
  const socketRef = useRef(socket);

  const sendMessageToNodes = async (event) => {
    if (event.key === "Enter" && newMessage && selectedNodes.length > 0) {
      // Trigger rocket animations
      triggerRocketAnimations();
      
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        for (let chatId of selectedNodes) {
          const { data } = await axios.post(
            "/api/message",
            {
              content: newMessage,
              chatId,
            },
            config
          );
          
          // Emit socket event for each message sent
          socketRef.current.emit("new message", data);
        }

        setNewMessage(""); // Clear the input
        setFetchAgain(prev => !prev); // Update chat list when sending messages to nodes
        
        // Delay deselecting nodes to allow animation to complete
        setTimeout(() => {
          setSelectedNodes([]); // Deselect all nodes
        }, 1500);
      } catch (error) {
        console.error("Failed to send messages: ", error);
      }
    }
  };

  const triggerRocketAnimations = () => {
    const newRockets = selectedNodes.map((nodeId, index) => ({
      id: `rocket-${Date.now()}-${index}`,
      targetNodeId: nodeId,
      startTime: Date.now()
    }));
    
    setRockets(newRockets);
    
    // Trigger explosion effect when rockets reach targets
    setTimeout(() => {
      selectedNodes.forEach((nodeId, index) => {
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
          // Add explosion effect
          const explosion = document.createElement('div');
          explosion.className = 'explosion';
          explosion.style.position = 'absolute';
          explosion.style.left = '50%';
          explosion.style.top = '50%';
          explosion.style.transform = 'translate(-50%, -50%)';
          explosion.style.pointerEvents = 'none';
          explosion.style.zIndex = '1001';
          
          nodeElement.appendChild(explosion);
          
          // Remove explosion after animation
          setTimeout(() => {
            if (explosion.parentNode) {
              explosion.parentNode.removeChild(explosion);
            }
          }, 500);
        }
      });
    }, 1200); // Slightly before rocket animation ends
    
    // Remove rockets after animation completes
    setTimeout(() => {
      setRockets([]);
    }, 1500);
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

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      // Reconnect socket if it's not connected or null
      socketRef.current = reconnectSocket();
    }
  
    if (socketRef.current) {
      socketRef.current.emit("setup", user);
      socketRef.current.on("connected", () => setSocketConnected(true));
      
      // Handle authentication errors
      socketRef.current.on("connect_error", (error) => {
        if (error.message.includes('jwt expired')) {
          toast({
            title: "Session Expired",
            description: "Please refresh the page and log in again",
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top",
          });
        }
      });
      
      // Join the selected chat room when chat changes
      if (selectedChat) {
        socketRef.current.emit("join chat", selectedChat._id);
      }
    }
  
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connected");
        socketRef.current.off("connect_error");
      }
    };
  }, [user, toast, selectedChat]);

  // Handle message reception
  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessageReceived = (newMessageReceived) => {
      if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
        setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
        setFetchAgain(!fetchAgain); // Update chat list to show latest message
      } else if (user && newMessageReceived.sender._id !== user._id) {
        // Add to notification if message is from another chat
        setNotification((prev) => [newMessageReceived, ...prev]);
        setFetchAgain(!fetchAgain);
      }
    }

    const handleTyping = () => {
      if (selectedChat) {
        console.log('Typing event received for chat:', selectedChat._id);
        setIsTyping(true);
      }
    };

    const handleStopTyping = () => {
      if (selectedChat) {
        console.log('Stop typing event received for chat:', selectedChat._id);
        setIsTyping(false);
      }
    };

    socketRef.current.on("message received", handleMessageReceived);
    socketRef.current.on("typing", handleTyping);
    socketRef.current.on("stop typing", handleStopTyping);
  
    return () => {
      if (socketRef.current) {
        socketRef.current.off("message received", handleMessageReceived);
        socketRef.current.off("typing", handleTyping);
        socketRef.current.off("stop typing", handleStopTyping);
      }
    };
  }, [selectedChat, fetchAgain, setFetchAgain]);

  // Join chat room when selectedChat changes
  useEffect(() => {
    if (selectedChat && socketConnected) {
      socketRef.current.emit("join chat", selectedChat._id);
    }
  }, [selectedChat, socketConnected]);


  useEffect(() => {
    fetchMessages();
  }, [selectedChat, fetchMessages]);

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      // Stop typing when sending message
      if (typing) {
        socketRef.current.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
      
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
        setFetchAgain(prev => !prev); // Update chat list when sending message
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
  
    if (!socketConnected || !selectedChat) return;
  
    if (!typing) {
      setTyping(true);
      console.log('Emitting typing event for chat:', selectedChat._id);
      socketRef.current.emit("typing", selectedChat._id);
    }
  
    let lastTypingTime = new Date().getTime();
    const timerLength = 3000;
  
    // Clear existing timeout
    if (window.typingTimeout) {
      clearTimeout(window.typingTimeout);
    }
  
    // Set new timeout
    window.typingTimeout = setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;
  
      if (timeDiff >= timerLength && typing) {
        console.log('Emitting stop typing event for chat:', selectedChat._id);
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
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d="flex" flexDir="column" justifyContent="center" alignItems="center" h="100%">
          <Box className="network-graph" position="relative" height="300px" mb={4}>
            {/* Rocket animations */}
            {rockets.map((rocket) => {
              const targetNode = chats.find(chat => chat._id === rocket.targetNodeId);
              if (!targetNode) return null;
              
              const nodeIndex = chats.findIndex(chat => chat._id === rocket.targetNodeId);
              const nodeCount = user?.nodePreference || 6;
              const angle = (nodeIndex / nodeCount) * 2 * Math.PI;
              const targetX = 50 + Math.cos(angle) * 40; // Reduced from 50 to 40 for better positioning
              const targetY = 50 + Math.sin(angle) * 40;
              
              // Calculate rotation angle to point towards target
              const rotationAngle = Math.atan2(targetY - 85, targetX - 50) * 180 / Math.PI + 90;
              
              return (
                <Box
                  key={rocket.id}
                  position="absolute"
                  left="50%"
                  top="85%"
                  fontSize="28px"
                  zIndex={10}
                  style={{
                    animation: `rocketFly-${rocket.id} 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                    transformOrigin: 'center',
                    filter: 'drop-shadow(0 0 8px rgba(255, 165, 0, 0.8))'
                  }}
                >
                  🚀
                  <style>
                    {`
                      @keyframes rocketFly-${rocket.id} {
                        0% {
                          transform: translate(-50%, -50%) scale(1) rotate(${rotationAngle}deg);
                          opacity: 1;
                          filter: drop-shadow(0 0 8px rgba(255, 165, 0, 0.8));
                        }
                        20% {
                          transform: translate(-50%, -50%) scale(1.1) rotate(${rotationAngle}deg);
                          opacity: 1;
                          filter: drop-shadow(0 0 12px rgba(255, 69, 0, 0.9));
                        }
                        80% {
                          transform: translate(
                            calc(-50% + ${(targetX - 50) * 3}px),
                            calc(-50% + ${(targetY - 85) * 3}px)
                          ) scale(1.3) rotate(${rotationAngle}deg);
                          opacity: 1;
                          filter: drop-shadow(0 0 15px rgba(255, 0, 0, 1));
                        }
                        100% {
                          transform: translate(
                            calc(-50% + ${(targetX - 50) * 3}px),
                            calc(-50% + ${(targetY - 85) * 3}px)
                          ) scale(0.5) rotate(${rotationAngle}deg);
                          opacity: 0;
                          filter: drop-shadow(0 0 20px rgba(255, 255, 0, 0.8));
                        }
                      }
                    `}
                  </style>
                </Box>
              );
            })}
            {chats &&
              chats.slice(0, user?.nodePreference || 6).map((chat, index) => {
              const nodeCount = user?.nodePreference || 6;
              const angle = (index / nodeCount) * 2 * Math.PI; // Divide into segments based on preference
              const x = `${50 + Math.cos(angle) * 50}%`;
              const y = `${50 + Math.sin(angle) * 50}%`;

              return (
                <Box
                  key={chat._id}
                  data-node-id={chat._id}
                  className={`node ${selectedNodes.includes(chat._id) ? "selected" : ""}`}
                  position="absolute"
                  top={y}
                  left={x}
                  backgroundColor={selectedNodes.includes(chat._id) ? "#372569" : "#744FDD"}
                  borderRadius="50%"
                  width="100px"
                  height="100px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => toggleNodeSelection(chat._id)}
                  cursor="pointer"
                  transform="translate(-50%, -50%)"
                  boxShadow={selectedNodes.includes(chat._id) ? "0 0 20px rgba(199, 92, 254, 0.8)" : "0 4px 8px rgba(0, 0, 0, 0.3)"}
                  transition="all 0.3s ease"
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
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </FormControl>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
