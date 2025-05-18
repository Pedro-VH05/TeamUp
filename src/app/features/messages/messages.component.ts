import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, setDoc, addDoc, serverTimestamp, orderBy, getDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { Observable, Subscription, firstValueFrom, map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

interface Message {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  timestamp: any;
  sport: string;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private routeSub!: Subscription;

  currentUser: any;
  conversations$: Observable<Conversation[]> | undefined;
  selectedConversation: string | null = null;
  messages$: Observable<Message[]> | undefined;
  newMessage = '';
  recipientId: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      this.recipientId = params['recipient'] || null;

      if (this.recipientId && this.currentUser) {
        this.findOrCreateConversation(this.currentUser.uid, this.recipientId);
      }
    });

    this.authService.currentUser$.subscribe(user => {
      if (!user) return;

      this.currentUser = user;
      this.loadConversations(user.uid, user.sport);

      if (this.recipientId) {
        this.findOrCreateConversation(user.uid, this.recipientId);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  async findOrCreateConversation(currentUserId: string, recipientId: string): Promise<void> {
    this.isLoading = true;
    try {
      const conversationsRef = collection(this.firestore, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId)
      );

      const conversations = await firstValueFrom(collectionData(q, { idField: 'id' }));
      const existingConv = conversations.find(conv =>
        conv['participants'].includes(recipientId)
      );

      if (existingConv) {
        this.selectConversation(existingConv.id);
      } else {
        await this.createNewConversation(currentUserId, recipientId);
      }
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createNewConversation(currentUserId: string, recipientId: string): Promise<void> {
    try {
      const recipientDoc = await getDoc(doc(this.firestore, 'users', recipientId));
      const recipientData = recipientDoc.data();

      const conversationData = {
        participants: [currentUserId, recipientId],
        participantNames: {
          [currentUserId]: this.getDisplayName(this.currentUser),
          [recipientId]: recipientData ? this.getDisplayName(recipientData) : 'Usuario'
        },
        participantPhotos: {
          [currentUserId]: this.getProfileImage(this.currentUser),
          [recipientId]: recipientData ? this.getProfileImage(recipientData) : 'assets/user-profile.jpg'
        },
        lastMessage: '',
        lastMessageTime: null,
        unreadCounts: {
          [currentUserId]: 0,
          [recipientId]: 0
        },
        sport: this.currentUser.sport,
        createdAt: serverTimestamp()
      };

      const conversationsRef = collection(this.firestore, 'conversations');
      const newConvRef = await addDoc(conversationsRef, conversationData);
      this.selectConversation(newConvRef.id);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      throw error;
    }
  }

  loadConversations(currentUserId: string, sport: string): void {
    const conversationsRef = collection(this.firestore, 'conversations');

    this.conversations$ = collectionData(
      query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId),
        where('sport', '==', sport)
      ), { idField: 'id' }
    ).pipe(
      map((conversations: any[]) => {
        return conversations.map(conv => {
          const otherUser = conv.participants.find((p: string) => p !== currentUserId);
          return {
            id: conv.id,
            userId: otherUser,
            userName: conv.participantNames?.[otherUser] || 'Usuario',
            userPhoto: conv.participantPhotos?.[otherUser] || 'assets/user-profile.jpg',
            lastMessage: conv.lastMessage || '',
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCounts?.[currentUserId] || 0
          };
        });
      })
    ) as Observable<Conversation[]>;
  }

  selectConversation(conversationId: string): void {
    this.selectedConversation = conversationId;
    this.recipientId = null;

    const messagesRef = collection(this.firestore, 'conversations', conversationId, 'messages');
    this.messages$ = collectionData(
      query(messagesRef, orderBy('timestamp', 'asc')),
      { idField: 'id' }
    ) as Observable<Message[]>;
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.selectedConversation || !this.currentUser) return;

    const messageData = {
      text: this.newMessage,
      senderId: this.currentUser.uid,
      senderName: this.getDisplayName(this.currentUser),
      senderPhoto: this.getProfileImage(this.currentUser),
      timestamp: serverTimestamp(),
      sport: this.currentUser.sport
    };

    try {
      const messagesRef = collection(this.firestore, 'conversations', this.selectedConversation, 'messages');
      await addDoc(messagesRef, messageData);

      const conversationRef = doc(this.firestore, 'conversations', this.selectedConversation);
      await setDoc(conversationRef, {
        lastMessage: this.newMessage,
        lastMessageTime: serverTimestamp()
      }, { merge: true });

      this.newMessage = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  getDisplayName(user: any): string {
    return user.type === 'team' ? user.teamName : `${user.firstName} ${user.lastName}`;
  }

  getProfileImage(user: any): string {
    return user.type === 'team' ? (user.teamLogoUrl || 'assets/team-default.png') :
      (user.profilePictureUrl || 'assets/user-profile.jpg');
  }

  navigateToFeed(): void {
    this.router.navigate(['/feed']);
  }
}
