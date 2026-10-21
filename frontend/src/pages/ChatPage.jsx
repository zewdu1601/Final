import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoChatbubblesOutline,
  IoCloseOutline,
  IoPeopleOutline,
  IoSendOutline,
  IoShieldCheckmarkOutline,
  IoStorefrontOutline,
} from 'react-icons/io5';
import { getApiErrorMessage } from '../services/api';
import chatService from '../services/chatService';
import './ChatPage.css';

const roleLabel = (role) => ({
  admin: 'Admin',
  manager: 'Store Manager',
  customer: 'Customer',
}[role] || 'Store team');

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const ChatPage = ({ user }) => {
  const navigate = useNavigate();
  const isStaff = Boolean(user?.is_admin || user?.role === 'admin' || user?.role === 'manager');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const bottomRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  const lastMarkedMessageIdRef = useRef({});
  const currentUserId = Number(user?.id);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingConversations(true);
    try {
      const nextConversations = await chatService.getConversations();
      setConversations(nextConversations);
      setSelectedId((currentId) => (
        nextConversations.some((conversation) => conversation.id === currentId)
          ? currentId
          : nextConversations[0]?.id || null
      ));
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      if (showLoading) setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, showLoading = false) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (showLoading) setLoadingMessages(true);
    try {
      const nextMessages = await chatService.getMessages(conversationId);
      if (selectedIdRef.current === conversationId) {
        setMessages(nextMessages);
        setMessageError('');
        if (nextMessages.length > 0) {
          const latestMessage = nextMessages[nextMessages.length - 1];
          const lastMarkedId = lastMarkedMessageIdRef.current[conversationId];
          const hasNewIncomingMessage = nextMessages.some(
            (message) => message.id > (lastMarkedId || 0)
              && Number(message.sender_id) !== currentUserId
          );
          if (lastMarkedId === undefined || hasNewIncomingMessage) {
            await chatService.markRead(
              conversationId,
              latestMessage.id
            );
            lastMarkedMessageIdRef.current[conversationId] = latestMessage.id;
          }
        }
      }
    } catch (requestError) {
      if (selectedIdRef.current === conversationId) {
        setMessageError(getApiErrorMessage(requestError));
      }
    } finally {
      if (showLoading && selectedIdRef.current === conversationId) setLoadingMessages(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadConversations(true);
    const timer = window.setInterval(() => loadConversations(), 5000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    setMessages([]);
    loadMessages(selectedId, true);
    if (!selectedId) return undefined;
    const timer = window.setInterval(() => loadMessages(selectedId), 3000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId),
    [conversations, selectedId]
  );
  const title = selectedConversation?.kind === 'staff'
    ? 'Admin & Store Manager'
    : isStaff
      ? `Customer: ${selectedConversation?.customer_name || selectedConversation?.customer_email || 'Support request'}`
      : selectedConversation?.kind === 'admin_support'
        ? 'Admin Support'
        : 'Store Manager Support';

  const conversationPreview = (conversation) => {
    if (!conversation.last_message) {
      return conversation.kind === 'staff'
        ? 'Private Admin and Store Manager room'
        : isStaff
          ? 'Waiting for customer message'
          : `Start a conversation with the ${conversation.kind === 'admin_support' ? 'Admin' : 'Store Manager'}`;
    }
    const sender = conversation.last_message_sender_id === currentUserId
      ? 'You'
      : roleLabel(conversation.last_message_sender_role);
    return `${sender}: ${conversation.last_message}`;
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    setMessageError('');
    try {
      const sentMessage = await chatService.sendMessage(selectedId, content);
      if (selectedIdRef.current === selectedId) {
        setMessages((current) => (
          current.some((message) => message.id === sentMessage.id)
            ? current
            : [...current, sentMessage]
        ));
        setDraft('');
      }
      loadConversations();
    } catch (requestError) {
      if (selectedIdRef.current === selectedId) {
        setMessageError(getApiErrorMessage(requestError));
      }
    } finally {
      setSending(false);
    }
  };

  const closeChat = () => {
    navigate(isStaff ? '/admin' : '/dashboard', { replace: true });
  };

  return (
    <main className="chat-page">
      <header className="chat-page-heading">
        <div>
          <p className="chat-eyebrow">AI STORE MESSAGING</p>
          <h1>Messages</h1>
          <p>{isStaff
            ? (user.role === 'manager'
              ? 'Reply to customers in the Store Manager inbox or coordinate privately with Admin.'
              : 'Reply to customers in the Admin inbox or coordinate privately with Store Managers.')
            : 'Choose a separate conversation with the Store Manager or Admin for help with products, orders, delivery, or your account.'}</p>
        </div>
        <button type="button" className="chat-close-button" onClick={closeChat} title="Close chat" aria-label="Close chat">
          <IoCloseOutline aria-hidden="true" />
          <span>Close</span>
        </button>
      </header>

      <section className="chat-workspace" aria-label="Chat messages">
        <aside className="chat-conversation-list">
          <div className="chat-list-heading">
            <IoChatbubblesOutline aria-hidden="true" />
            <h2>{isStaff ? `${roleLabel(user.role)} Inbox` : 'Choose who to contact'}</h2>
          </div>
          {loadingConversations && <p className="chat-list-state" role="status">Loading conversations…</p>}
          {error && (
            <div className="chat-inline-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => loadConversations(true)}>Retry</button>
            </div>
          )}
          {!loadingConversations && !error && conversations.map((conversation) => {
            const staffRoom = conversation.kind === 'staff';
            const recipientLabel = conversation.kind === 'admin_support' ? 'Admin' : 'Store Manager';
            return (
              <button
                type="button"
                key={conversation.id}
                className={`chat-conversation${selectedId === conversation.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(conversation.id)}
              >
                <span className={`chat-conversation-avatar${staffRoom ? ' is-staff' : conversation.kind === 'admin_support' ? ' is-admin' : ''}`}>
                  {staffRoom
                    ? <IoPeopleOutline aria-hidden="true" />
                    : conversation.kind === 'admin_support'
                      ? <IoShieldCheckmarkOutline aria-hidden="true" />
                      : <IoStorefrontOutline aria-hidden="true" />}
                </span>
                <span className="chat-conversation-copy">
                  <strong>{staffRoom ? 'Staff room' : isStaff ? conversation.customer_name || conversation.customer_email : recipientLabel}</strong>
                  <small>{conversationPreview(conversation)}</small>
                </span>
                {conversation.last_message_at && <time>{formatTime(conversation.last_message_at)}</time>}
              </button>
            );
          })}
          {!loadingConversations && !error && conversations.length === 0 && (
            <p className="chat-list-state">No conversations are available.</p>
          )}
        </aside>

        <div className="chat-thread">
          {selectedConversation ? (
            <>
              <header className="chat-thread-heading">
                <span className={`chat-thread-avatar${selectedConversation.kind === 'staff' ? ' is-staff' : selectedConversation.kind === 'admin_support' ? ' is-admin' : ''}`}>
                  {selectedConversation.kind === 'staff'
                    ? <IoShieldCheckmarkOutline aria-hidden="true" />
                    : <IoStorefrontOutline aria-hidden="true" />}
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{selectedConversation.kind === 'staff'
                    ? 'Private staff communication'
                    : isStaff
                      ? `${selectedConversation.customer_email || ''} · Customer account · Reply as ${roleLabel(user.role)}`
                      : `Private conversation with ${selectedConversation.kind === 'admin_support' ? 'Admin' : 'Store Manager'}`}</p>
                </div>
                <span className="chat-live-indicator"><i /> Live</span>
              </header>

              <div className="chat-message-list" aria-live="polite" aria-relevant="additions text">
                {loadingMessages && messages.length === 0 && <p className="chat-thread-state" role="status">Loading messages…</p>}
                {!loadingMessages && !messageError && messages.length === 0 && (
                  <div className="chat-empty-thread">
                    <IoChatbubblesOutline aria-hidden="true" />
                    <strong>{selectedConversation.kind === 'staff'
                      ? 'Welcome to the staff room'
                      : `Message the ${selectedConversation.kind === 'admin_support' ? 'Admin' : 'Store Manager'}`}</strong>
                    <p>{selectedConversation.kind === 'staff'
                      ? 'Keep store coordination here. This room is visible only to Admins and Store Managers.'
                      : 'Your messages and replies stay in this separate conversation. The other support agent cannot see this thread.'}</p>
                  </div>
                )}
                {messages.map((message) => {
                  const ownMessage = Number(message.sender_id) === currentUserId;
                  return (
                    <article className={`chat-message${ownMessage ? ' is-own' : ''}`} key={message.id}>
                      <div className="chat-message-meta">
                        <strong>{ownMessage ? 'You' : message.sender_name}</strong>
                        <span className={`chat-role-badge role-${message.sender_role}`}>
                          {ownMessage && isStaff ? `You · ${roleLabel(message.sender_role)}` : roleLabel(message.sender_role)}
                        </span>
                        <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                      </div>
                      <p>{message.content}</p>
                    </article>
                  );
                })}
                {messageError && (
                  <div className="chat-inline-error chat-message-error" role="alert">
                    <p>{messageError}</p>
                    <button type="button" onClick={() => loadMessages(selectedId, true)}>Retry</button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form className="chat-composer" onSubmit={submitMessage}>
                <label className="visually-hidden" htmlFor="chat-message-input">Write a message</label>
                <textarea
                  id="chat-message-input"
                  rows="2"
                  maxLength="2000"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message…"
                  disabled={sending}
                />
                <div className="chat-composer-footer">
                  <span>{draft.length}/2000</span>
                  <button type="submit" disabled={!draft.trim() || sending || !selectedId}>
                    <IoSendOutline aria-hidden="true" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-empty-thread">
              <IoChatbubblesOutline aria-hidden="true" />
              <strong>{loadingConversations ? 'Opening messages…' : 'Messages unavailable'}</strong>
              <p>{error ? 'Retry loading conversations to continue.' : 'Sign in with a supported account to chat.'}</p>
            </div>
          )}
        </div>
      </section>
      <p className="chat-security-note">Messages are visible only to the conversation participants and authorized store staff.</p>
    </main>
  );
};

export default ChatPage;
