import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, setDoc, addDoc, serverTimestamp, orderBy } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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
export class MessagesComponent implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: any;
  conversations$: Observable<Conversation[]> | undefined;
  selectedConversation: string | null = null;
  messages$: Observable<Message[]> | undefined;
  newMessage = '';

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) return;

      this.currentUser = user;
      this.loadConversations(user.uid, user.sport);
    });
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

    const messagesRef = collection(this.firestore, 'conversations', this.selectedConversation, 'messages');
    await addDoc(messagesRef, messageData);

    const conversationRef = doc(this.firestore, 'conversations', this.selectedConversation);
    await setDoc(conversationRef, {
      lastMessage: this.newMessage,
      lastMessageTime: serverTimestamp()
    }, { merge: true });

    this.newMessage = '';
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
