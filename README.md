# Como Ejecutar el Projecto

> [!IMPORTANT]
> Hay pasos que solo se realizan la primera vez

- [Primera Vez] se intalan las dependencia con
```bash
npm install
```
- [Primera Vez][Local] creación del contenedor con uso de un .env file
```bash
docker-compose --env-file .env up -d
```
> [!NOTE]
> En caso de ya tener el contenedor usar el siguiente comando:
> ```
> docker-compose up -d
> ```

- [Primera Vez] ejecucion de migraciones y semillas
```
npm run migrate:latest
npm run seed:run
```
- ejecutar el projecto:
  
> [!NOTE]
>  Nodo Desarrollo
> ```
> npm run dev
> ```

> [!NOTE]
>  Nodo Produccion
> ```
> npm run start
> ```