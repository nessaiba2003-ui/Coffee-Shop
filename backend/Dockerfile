FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -B
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S velora && adduser -S velora -G velora
USER velora
WORKDIR /app
COPY --from=build /app/target/velora-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
