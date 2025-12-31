# JASCA 폐쇄망 Docker 설치 가이드

> 사내 폐쇄망 서버에 JASCA를 Docker로 배포하기 위한 간소화된 가이드입니다.

---

## 1. 외부 환경: Docker 이미지 빌드 및 저장

인터넷이 연결된 개발 PC에서 실행합니다.

```bash
# 프로젝트 루트 디렉토리로 이동
cd /path/to/jasca

# Docker 이미지 빌드
docker build -f docker/monolith/Dockerfile -t jasca-offline:latest .

# tar 파일로 저장 (약 2~3GB)
docker save jasca-offline:latest -o jasca-offline.tar
```

**생성된 파일**: `jasca-offline.tar` → 폐쇄망 서버로 전송

---

## 2. 폐쇄망 서버: Docker 이미지 로드

```bash
# 이미지 로드
docker load -i jasca-offline.tar

# 로드 확인
docker images | grep jasca
```

---

## 3. Nginx 설정

`/etc/nginx/sites-available/jasca.conf` (또는 해당 서버 설정 경로):

```nginx
server {
    server_name jasca.koreacb.com;

    include bitnami/ssl.conf;
    add_header Access-Control-Allow-Origin *;

    location / {
        gzip off;

        proxy_pass http://192.168.120.47:3003;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

```bash
# 설정 적용
sudo nginx -t && sudo systemctl reload nginx
```

> **참고**: `/api/*` 요청은 Next.js 내부 rewrites로 자동 프록시되므로 별도 설정 불필요

---

## 4. Docker 컨테이너 실행

```bash
# 볼륨 생성
docker volume create jasca_postgres_data
docker volume create jasca_redis_data

# 컨테이너 실행
docker run -d \
  --name jasca \
  --restart unless-stopped \
  -p 3003:3000 \
  -v jasca_postgres_data:/var/lib/postgresql/data \
  -v jasca_redis_data:/var/lib/redis \
  jasca-offline:latest
```

---

## 5. 접속 확인

| 구분 | URL |
|------|-----|
| 외부 접속 | https://jasca.koreacb.com |
| 내부 테스트 | http://192.168.120.47:3003 |

```bash
# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs -f jasca
```

---

## 운영 명령어

```bash
# 중지
docker stop jasca

# 시작
docker start jasca

# 재시작
docker restart jasca

# 삭제 (데이터 유지)
docker stop jasca && docker rm jasca

# 완전 초기화 (데이터 삭제)
docker stop jasca && docker rm jasca
docker volume rm jasca_postgres_data jasca_redis_data
```
