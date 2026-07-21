# 🔐 Google OAuth Setup - Poker Club MVP

## Configuração do Google OAuth

Este documento explica como configurar a autenticação com Google no Poker Club MVP.

---

## 1️⃣ Criar Aplicação no Google Cloud Console

### Passo 1: Ir ao Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services** → **Credentials**

### Passo 2: Criar OAuth 2.0 Credentials
1. Clique em **+ Create Credentials** → **OAuth 2.0 Client IDs**
2. Selecione **Web Application**
3. Configure:
   - **Name:** Poker Club
   - **Authorized JavaScript origins:**
     - http://localhost:3001
     - http://localhost:3000
     - https://seu-dominio.com
   - **Authorized redirect URIs:**
     - http://localhost:3001/auth/google/callback
     - http://localhost:3000/auth/google/callback
     - https://seu-dominio.com/auth/google/callback

### Passo 3: Copiar Credenciais
- Copie o **Client ID** e **Client Secret**

---

## 2️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env` ou `.env.local` no backend:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=seu-secret-aleatorio
JWT_EXPIRY=24h

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/poker_club
```

---

## 3️⃣ Instalar Dependências

### Backend
```bash
cd packages/backend
npm install passport-google-oauth20 @types/passport-google-oauth20
npm install bcrypt @types/bcrypt
```

### Frontend
```bash
cd packages/web
npm install
```

---

## 4️⃣ Executar Migrations do Banco

```bash
cd packages/backend
npx prisma generate
npx prisma migrate dev --name add_google_oauth
```

---

## 5️⃣ Iniciar o Servidor

### Backend
```bash
cd packages/backend
npm run dev
```

### Frontend
```bash
cd packages/web
npm run dev
```

---

## 🔗 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Registrar com email/senha |
| POST | `/auth/login` | Login com email/senha |
| GET | `/auth/google` | Iniciar login com Google |
| GET | `/auth/google/callback` | Callback do Google |
| POST | `/auth/refresh` | Renovar token JWT |
| POST | `/auth/logout` | Logout |

---

## 📝 Exemplo de Uso (Frontend)

### Componente de Login com Google

```tsx
import { GoogleAuthButton } from '@/app/components/google-auth-button';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function LoginPage() {
  const { login } = useAuthStore();

  const handleGoogleSuccess = (token: string, user: any) => {
    login(token, user);
    // Redirecionar para dashboard
  };

  return (
    <div>
      <h1>Entrar no Poker Club</h1>
      <GoogleAuthButton onSuccess={handleGoogleSuccess} />
    </div>
  );
}
```

---

## 🔐 Fluxo de Autenticação

```
1. Usuário clica "Entrar com Google"
   ↓
2. Redireciona para /auth/google
   ↓
3. Google OAuth login (popup/redirect)
   ↓
4. Google retorna para /auth/google/callback
   ↓
5. Backend valida e cria/retorna usuário
   ↓
6. Backend redireciona para frontend com JWT token
   ↓
7. Frontend armazena token em localStorage
   ↓
8. Usuário autenticado no dashboard
```

---

## 🛡️ Segurança

✅ **JWT Token:** Válido por 24h  
✅ **Refresh Token:** Para renovar sem re-autenticar  
✅ **Password Hashing:** bcrypt com salt 10  
✅ **HTTPS:** Obrigatório em produção  
✅ **Webhook Verification:** Google OAuth verificado  
✅ **Rate Limiting:** Implementar no middleware  

---

## 🐛 Troubleshooting

### Erro: "Invalid redirect URI"
- Verifique se a URI está exatamente igual no Google Console
- Incluir `http://` ou `https://`

### Erro: "User already exists with different auth method"
- O email foi registrado com email/senha antes
- Usuário precisa usar aquele método ou criar novo email

### Erro: "Invalid client credentials"
- Verificar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
- Verificar se estão no arquivo .env

### Token não funciona no WebSocket
- Enviar no header: `Authorization: Bearer <token>`
- Ou no query param: `?token=<token>`

---

## 📱 Mobile (React Native)

Para React Native, usar:
```bash
npm install expo-auth-session expo-web-browser
```

Ou usar WebView com OAuth flow:
```tsx
import { WebView } from 'react-native-webview';

export function GoogleLoginWebView() {
  return (
    <WebView
      source={{ uri: 'http://localhost:3001/auth/google' }}
      onNavigationStateChange={(navState) => {
        if (navState.url.includes('token=')) {
          // Extrair e armazenar token
        }
      }}
    />
  );
}
```

---

## 🚀 Deploy em Produção

### Heroku
```bash
heroku config:set GOOGLE_CLIENT_ID=...
heroku config:set GOOGLE_CLIENT_SECRET=...
heroku config:set GOOGLE_CALLBACK_URL=https://seu-app.herokuapp.com/auth/google/callback
```

### AWS
```bash
aws ssm put-parameter --name GOOGLE_CLIENT_ID --value ...
aws ssm put-parameter --name GOOGLE_CLIENT_SECRET --value ...
```

### Docker
```dockerfile
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV GOOGLE_CALLBACK_URL=https://seu-dominio.com/auth/google/callback
```

---

## 📚 Links Úteis

- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)

---

**🎰 Poker Club MVP - Google OAuth Setup Complete!** ✅
