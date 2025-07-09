import { Button } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { Flex,Image } from '@chakra-ui/react';
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import Logo from "./logo192.png";
import {
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from "@chakra-ui/menu";
import { Select } from "@chakra-ui/select";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { useHistory } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { useToast } from "@chakra-ui/toast";
import ChatLoading from "../ChatLoading";
import { Spinner } from "@chakra-ui/spinner";
import ProfileModal from "./ProfileModal";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
  } = ChatState();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const history = useHistory();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const updateNodePreference = async (nodePreference) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(
        "/api/user/preferences",
        { nodePreference: parseInt(nodePreference) },
        config
      );

      // Update user in localStorage
      const updatedUser = { ...user, nodePreference: data.nodePreference };
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      
      toast({
        title: "Preference Updated",
        description: `Node preference set to ${nodePreference}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } catch (error) {
      toast({
        title: "Error updating preference",
        description: error.response?.data?.message || "Something went wrong",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleSearch = async () => {
    if (!search) {
      toast({
        title: "Please Enter something in search",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }

    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(`/api/user?search=${search}`, config);

      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const accessChat = async (userId) => {
    console.log(userId);

    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      toast({
        title: "Error fetching the chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  return (
    <>
      <Box
        d="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="#313764"
        w="100%"
        p="5px 10px 5px 10px"
        borderWidth="5px"
        borderColor="#a7a3ff"
      >
        <Tooltip label="Search Users to chat" hasArrow placement="bottom-end">
          <Button variant="ghost" onClick={onOpen} bg="#6965F1"  borderRadius="20px">
            <i className="fas fa-search"></i>
            <Text d={{ base: "none", md: "flex" }} px={4}>
              Search User
            </Text>
          </Button>
        </Tooltip>
        <Flex alignItems="center">
          <Image 
            src={Logo} 
            alt="Logo" 
            boxSize="40px" // Adjust size as needed
            marginRight="10px" // Spacing between image and text
          />
          <Text fontSize="2xl" fontFamily="Work sans" color="#AAE7FF">
            Connect
          </Text>
        </Flex>
        <div>
          <Menu>
            <MenuButton p={1}>
              <NotificationBadge
                count={notification.length}
                effect={Effect.SCALE}
              />
              <BellIcon fontSize="2xl" m={1} color="#6965F1" />
            </MenuButton>
            <MenuList pl={2}>
              {!notification.length && "No New Messages"}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  {notif.chat.isGroupChat
                    ? `New Message in ${notif.chat.chatName}`
                    : `New Message from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton as={Button} bg="#744FDD" rightIcon={<ChevronDownIcon />} borderRadius="20px">
              <Avatar
                size="sm"
                cursor="pointer"
                name={user.name}
                src={user.pic}
              />
            </MenuButton >
            <MenuList bg="#744FDD" color="#fff">
              <ProfileModal user={user}>
                <MenuItem _hover={{ bg: "#a7a3ff", color: "#fff" }}>My Profile</MenuItem>{" "}
              </ProfileModal>
              <MenuDivider />
              <Box px={3} py={2}>
                <Text fontSize="sm" mb={2}>Nodes to Display:</Text>
                <Select
                  size="sm"
                  value={user?.nodePreference || 6}
                  onChange={(e) => updateNodePreference(e.target.value)}
                  bg="white"
                  color="black"
                  borderColor="#a7a3ff"
                >
                  <option value="3">3 Nodes</option>
                  <option value="6">6 Nodes</option>
                  <option value="9">9 Nodes</option>
                  <option value="12">12 Nodes</option>
                </Select>
              </Box>
              <MenuDivider />
              <MenuItem _hover={{ bg: "#a7a3ff", color: "#fff" }} onClick={logoutHandler}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </div>
      </Box>

      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent bg="#744FDD">
          <DrawerHeader borderBottomWidth="1px" color="white">Search Users</DrawerHeader>
            <DrawerBody >
              <Box d="flex" pb={2}>
                <Input
                placeholder="Search by name or email"
                mr={2}
                bg="white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                />
                <Button _hover={{bg:"#2B4274", color:"#fff"}} onClick={handleSearch}>Go</Button>
              </Box>
            {loading ? (
              <ChatLoading />
              ) : (
                searchResult?.map((user) => (
                  <UserListItem
                  key={user._id}
                  user={user} // Pass the user object
                  handleFunction={() => accessChat(user._id)} // Handle function for creating chat
                  />
                ))
              )}
              {loadingChat && <Spinner ml="auto" d="flex" />}
            </DrawerBody>
        </DrawerContent>
      </Drawer>

    </>
  );
}

export default SideDrawer;
