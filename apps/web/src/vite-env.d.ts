/// <reference types="vite/client" />
import 'firebase/auth';

declare module 'firebase/auth' {
    interface User {
        nickname?: string;
    }
}
